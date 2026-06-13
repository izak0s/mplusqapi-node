import { Agent, request as httpsRequest } from 'node:https';
import {
  MplusApiClientError,
  MplusApiCommunicationError,
  MplusApiServerError,
  MplusApiFaultError,
} from './errors';
import { parseEnvelopeBody } from './soap';
import { setTimeZone } from './datetime';

/** Errors where the connection was never established — the request cannot have been processed. */
const SAFE_RETRY_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH']);

export interface TransportOptions {
  host: string;
  port: number;
  ident: string;
  secret: string;
  /** Request timeout in seconds. Default: 30. */
  timeout?: number;
  /** Max retry attempts on network/transport errors. Default: 3. */
  maxRetries?: number;
  /** Base retry delay in ms (exponential backoff). Default: 500. */
  retryDelay?: number;
  /**
   * IANA time zone used to interpret/emit the API's wall-clock date structs.
   * Default: 'Europe/Amsterdam'. Process-wide — see setTimeZone in datetime.ts.
   */
  timezone?: string;
  /** Abort all in-flight requests from this client (e.g. on shutdown). */
  signal?: AbortSignal;
}

/** A completed HTTP response. Any status — non-2xx is not an error here. */
export interface HttpResponse {
  status: number;
  body: string;
}

export interface HttpRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
  timeoutMs: number;
  signal?: AbortSignal;
}

/**
 * Performs one HTTP POST. Resolves for any completed response (including 4xx/5xx);
 * rejects only on transport failure, with `code` set (e.g. 'ECONNREFUSED').
 * Injectable so tests can run without sockets; defaults to {@link nodeHttpsClient}.
 */
export type HttpClient = (req: HttpRequest) => Promise<HttpResponse>;

function abortError(): NodeJS.ErrnoException {
  const e = new Error('Request aborted') as NodeJS.ErrnoException;
  e.code = 'ABORT_ERR';
  return e;
}

const keepAliveAgent = new Agent({ keepAlive: true });

const nodeHttpsClient: HttpClient = (req) =>
  new Promise<HttpResponse>((resolve, reject) => {
    const url = new URL(req.url);
    const clientReq = httpsRequest(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        agent: keepAliveAgent,
        headers: { ...req.headers, 'Content-Length': Buffer.byteLength(req.body) },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
      },
    );

    clientReq.on('error', reject);

    if (req.timeoutMs > 0) {
      clientReq.setTimeout(req.timeoutMs, () => {
        const e = new Error(`Request timed out after ${req.timeoutMs}ms`) as NodeJS.ErrnoException;
        e.code = 'ETIMEDOUT';
        clientReq.destroy(e);
      });
    }

    if (req.signal) {
      if (req.signal.aborted) {
        clientReq.destroy(abortError());
      } else {
        req.signal.addEventListener('abort', () => clientReq.destroy(abortError()), { once: true });
      }
    }

    clientReq.write(req.body);
    clientReq.end();
  });

export class SoapTransport {
  private readonly url: string;
  private readonly baseHeaders: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly signal?: AbortSignal;
  private readonly httpClient: HttpClient;

  constructor(options: TransportOptions, httpClient: HttpClient = nodeHttpsClient) {
    if (options.timezone !== undefined) {
      setTimeZone(options.timezone);
    }
    // Auth travels as query params (?ident=…&secret=…), not SOAP headers.
    const query = new URLSearchParams({ ident: options.ident, secret: options.secret });
    this.url = `https://${options.host}:${options.port}/?${query.toString()}`;
    this.baseHeaders = {
      'Content-Type': 'text/xml; charset=utf-8',
      'User-Agent': 'mplusqapi-node',
    };
    this.timeoutMs = (options.timeout ?? 30) * 1000;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 500;
    this.signal = options.signal;
    this.httpClient = httpClient;
  }

  async send(operationName: string, xmlRequest: string, requestId?: string, idempotent = false): Promise<string> {
    // One ID for all attempts so the server can correlate/dedupe retries.
    const rid = requestId ?? `mpac_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        // Full jitter on exponential backoff to avoid synchronized retries.
        const backoff = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, backoff * (0.5 + Math.random() * 0.5)));
      }
      try {
        return await this.sendOnce(operationName, xmlRequest, rid);
      } catch (err) {
        lastError = err;
        if (!this.isRetryable(err, idempotent)) {
          throw err;
        }
      }
    }
    throw lastError;
  }

  /**
   * Idempotent calls (request carries an idempotencyKey) may retry any
   * communication error. For everything else, only retry when the request
   * provably never reached the server — a timeout or reset after sending a
   * non-idempotent mutation (e.g. createOrder) could otherwise duplicate it.
   */
  private isRetryable(err: unknown, idempotent: boolean): boolean {
    if (!(err instanceof MplusApiCommunicationError) || this.signal?.aborted) return false;
    if (idempotent) return true;
    return err.code !== undefined && SAFE_RETRY_CODES.has(err.code);
  }

  private async sendOnce(operationName: string, xmlRequest: string, requestId: string): Promise<string> {
    let response: HttpResponse;
    try {
      response = await this.httpClient({
        url: this.url,
        headers: {
          ...this.baseHeaders,
          'SOAPAction': operationName,
          'X-Request-Id': requestId,
        },
        body: xmlRequest,
        timeoutMs: this.timeoutMs,
        signal: this.signal,
      });
    } catch (err) {
      // Transport-level failure: no response was received.
      const code = (err as NodeJS.ErrnoException).code;
      const message = err instanceof Error ? err.message : String(err);
      throw new MplusApiCommunicationError(message, xmlRequest, '', code);
    }

    const xmlResponse = response.body;
    if (response.status >= 200 && response.status < 300) {
      return xmlResponse;
    }

    // Non-2xx: the server responded. Surface a SOAP fault if one is present,
    // otherwise a generic communication error carrying the HTTP status.
    try {
      const parsed = parseEnvelopeBody(xmlResponse);
      if ('fault' in parsed) {
        const { faultcode, faultstring } = parsed.fault;
        const message = `[${faultcode}] ${operationName}: ${faultstring}`;
        if (faultcode.startsWith('Client')) {
          throw new MplusApiClientError(message, faultcode, xmlRequest, xmlResponse);
        } else if (faultcode.startsWith('Server')) {
          throw new MplusApiServerError(message, faultcode, xmlRequest, xmlResponse);
        } else {
          throw new MplusApiFaultError(message, faultcode, xmlRequest, xmlResponse);
        }
      }
    } catch (parseErr) {
      if (
        parseErr instanceof MplusApiClientError ||
        parseErr instanceof MplusApiServerError ||
        parseErr instanceof MplusApiFaultError
      ) {
        throw parseErr;
      }
    }

    throw new MplusApiCommunicationError(
      `HTTP ${response.status}`,
      xmlRequest,
      xmlResponse,
      undefined,
      response.status,
    );
  }
}
