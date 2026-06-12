import axios, { AxiosInstance } from 'axios';
import {
  MplusApiClientError,
  MplusApiCommunicationError,
  MplusApiServerError,
  MplusApiFaultError,
} from './errors';
import { parseEnvelopeBody } from './soap';

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
}

export class SoapTransport {
  private readonly http: AxiosInstance;
  private readonly endpoint: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(options: TransportOptions) {
    const scheme = 'https';
    this.endpoint = `${scheme}://${options.host}:${options.port}/`;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 500;

    this.http = axios.create({
      baseURL: this.endpoint,
      params: { ident: options.ident, secret: options.secret },
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'User-Agent': 'mplusqapi-node/1.0.0',
      },
      httpsAgent: options.rejectUnauthorized === false
        ? new (require('https').Agent)({ rejectUnauthorized: false })
        : undefined,
      timeout: (options.timeout ?? 30) * 1000,
    });
  }

  async send(operationName: string, xmlRequest: string, requestId?: string): Promise<string> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt - 1)));
      }
      try {
        return await this.sendOnce(operationName, xmlRequest, requestId);
      } catch (err) {
        lastError = err;
        if (!(err instanceof MplusApiCommunicationError)) {
          throw err;
        }
      }
    }
    throw lastError;
  }

  private async sendOnce(operationName: string, xmlRequest: string, requestId?: string): Promise<string> {
    const headers: Record<string, string> = {
      'SOAPAction': operationName,
      'X-Request-Id': requestId ?? `mpac_${Date.now()}_${Math.random().toString(36).slice(2)}`,
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
          );
        }

        throw new MplusApiCommunicationError(err.message, xmlRequest, xmlResponse);
      }

      throw new MplusApiCommunicationError(
        err instanceof Error ? err.message : String(err),
        xmlRequest,
        xmlResponse,
      );
    }
  }
}
