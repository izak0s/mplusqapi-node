export class MplusApiError extends Error {
  readonly xmlRequest: string;
  readonly xmlResponse: string;

  constructor(message: string, xmlRequest: string, xmlResponse: string) {
    super(message);
    this.name = 'MplusApiError';
    this.xmlRequest = xmlRequest;
    this.xmlResponse = xmlResponse;
  }
}

export class MplusApiFaultError extends MplusApiError {
  readonly faultCode: string;

  constructor(message: string, faultCode: string, xmlRequest: string, xmlResponse: string) {
    super(message, xmlRequest, xmlResponse);
    this.name = 'MplusApiFaultError';
    this.faultCode = faultCode;
  }
}

/** Server rejected the request — fix the request and retry. */
export class MplusApiClientError extends MplusApiFaultError {
  constructor(message: string, faultCode: string, xmlRequest: string, xmlResponse: string) {
    super(message, faultCode, xmlRequest, xmlResponse);
    this.name = 'MplusApiClientError';
  }
}

/** Server-side failure — safe to retry. */
export class MplusApiServerError extends MplusApiFaultError {
  constructor(message: string, faultCode: string, xmlRequest: string, xmlResponse: string) {
    super(message, faultCode, xmlRequest, xmlResponse);
    this.name = 'MplusApiServerError';
  }
}

/** Network or HTTP-level failure. */
export class MplusApiCommunicationError extends MplusApiError {
  constructor(message: string, xmlRequest: string, xmlResponse: string) {
    super(message, xmlRequest, xmlResponse);
    this.name = 'MplusApiCommunicationError';
  }
}

/** Failed to serialize request to XML. */
export class MplusApiSerializationError extends MplusApiError {
  constructor(message: string) {
    super(message, '', '');
    this.name = 'MplusApiSerializationError';
  }
}

/** Failed to deserialize XML response. */
export class MplusApiDeserializationError extends MplusApiError {
  constructor(message: string, xmlRequest: string, xmlResponse: string) {
    super(message, xmlRequest, xmlResponse);
    this.name = 'MplusApiDeserializationError';
  }
}
