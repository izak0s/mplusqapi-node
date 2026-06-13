import axios, { AxiosInstance } from 'axios';
import { Agent } from 'node:https';

/** Errors where the connection was never established — the request cannot have been processed. */
const SAFE_RETRY_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH']);
import {
  MplusApiClientError,
  MplusApiCommunicationError,
  MplusApiServerError,
  MplusApiFaultError,
} from './errors';
import { parseEnvelopeBody, setTimeZone } from './soap';

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
  /** Disable TLS certificate validation (not recommended in production). */
  rejectUnauthorized?: boolean;
  /**
   * IANA time zone used to interpret/emit the API's wall-clock date structs.
   * Default: 'Europe/Amsterdam'. Process-wide — see setTimeZone in soap.ts.
   */
  timezone?: string;
  /** Abort all in-flight requests from this client (e.g. on shutdown). */
  signal?: AbortSignal;
}

export class SoapTransport {
  private readonly http: AxiosInstance;
  private readonly endpoint: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly signal?: AbortSignal;

  constructor(options: TransportOptions) {
    if (options.timezone !== undefined) {
      setTimeZone(options.timezone);
    }
    const scheme = 'https';
    this.endpoint = `${scheme}://${options.host}:${options.port}/`;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 500;
    this.signal = options.signal;

    this.http = axios.create({
      baseURL: this.endpoint,
      params: { ident: options.ident, secret: options.secret },
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'User-Agent': 'mplusqapi-node/1.0.0',
      },
      httpsAgent: options.rejectUnauthorized === false
        ? new Agent({ rejectUnauthorized: false })
        : undefined,
      timeout: (options.timeout ?? 30) * 1000,
      // The body is always XML — never let axios JSON-parse it.
      responseType: 'text',
      signal: options.signal,
    });
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
    const headers: Record<string, string> = {
      'SOAPAction': operationName,
      'X-Request-Id': requestId,
    };

    let xmlResponse = '';
    try {
      const response = await this.http.post(
        this.endpoint,
        xmlRequest,
        { headers },
      );
      xmlResponse = response.data as string;
      return xmlResponse;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        xmlResponse = (err.response?.data as string) ?? '';

        if (err.response) {
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
            `HTTP ${err.response.status}: ${err.message}`,
            xmlRequest,
            xmlResponse,
            err.code,
            err.response.status,
          );
        }

        throw new MplusApiCommunicationError(err.message, xmlRequest, xmlResponse, err.code);
      }

      throw new MplusApiCommunicationError(
        err instanceof Error ? err.message : String(err),
        xmlRequest,
        xmlResponse,
      );
    }
  }
}
