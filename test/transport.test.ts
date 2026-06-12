import { test, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import axios, { AxiosError } from 'axios';
import { SoapTransport } from '../src/transport';
import {
  MplusApiClientError,
  MplusApiServerError,
  MplusApiCommunicationError,
} from '../src/errors';

// SoapTransport builds its own axios instance in the constructor; intercept
// axios.create so every instance posts through our stub.
let postCalls = 0;
let postImpl: () => Promise<{ data: string }>;

(axios as { create: unknown }).create = () => ({
  post: () => {
    postCalls++;
    return postImpl();
  },
});

beforeEach(() => {
  postCalls = 0;
});

function makeTransport() {
  return new SoapTransport({
    host: 'test.invalid',
    port: 443,
    ident: 'ident',
    secret: 'secret',
    maxRetries: 2,
    retryDelay: 1,
  });
}

function faultEnvelope(faultcode: string, faultstring: string): string {
  return (
    '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">' +
    '<SOAP-ENV:Body><SOAP-ENV:Fault>' +
    `<faultcode>SOAP-ENV:${faultcode}</faultcode>` +
    `<faultstring>${faultstring}</faultstring>` +
    '</SOAP-ENV:Fault></SOAP-ENV:Body></SOAP-ENV:Envelope>'
  );
}

function httpError(status: number, data: string): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    { status, statusText: 'Error', data, headers: {}, config: {} } as never,
  );
}

test('send returns response body on success', async () => {
  postImpl = async () => ({ data: '<ok/>' });
  const result = await makeTransport().send('getApiVersion', '<xml/>');
  assert.equal(result, '<ok/>');
  assert.equal(postCalls, 1);
});

test('HTTP error with Client.* fault throws MplusApiClientError without retry', async () => {
  postImpl = async () => {
    throw httpError(500, faultEnvelope('Client.ORDER_NOT_FOUND', 'Order not found'));
  };
  await assert.rejects(
    makeTransport().send('getOrder', '<xml/>'),
    (err: unknown) => {
      assert.ok(err instanceof MplusApiClientError);
      assert.equal(err.faultCode, 'Client.ORDER_NOT_FOUND');
      assert.match(err.message, /getOrder: Order not found/);
      assert.equal(err.xmlRequest, '<xml/>');
      assert.ok(err.xmlResponse.includes('ORDER_NOT_FOUND'));
      return true;
    },
  );
  assert.equal(postCalls, 1, 'client faults must not be retried');
});

test('HTTP error with Server.* fault throws MplusApiServerError without retry', async () => {
  postImpl = async () => {
    throw httpError(500, faultEnvelope('Server.INTERNAL', 'boom'));
  };
  await assert.rejects(makeTransport().send('getOrder', '<xml/>'), MplusApiServerError);
  assert.equal(postCalls, 1);
});

test('network error retries maxRetries times then throws MplusApiCommunicationError', async () => {
  postImpl = async () => {
    throw new AxiosError('socket hang up', 'ECONNRESET');
  };
  await assert.rejects(
    makeTransport().send('getOrders', '<xml/>'),
    MplusApiCommunicationError,
  );
  assert.equal(postCalls, 3, 'maxRetries=2 means 3 total attempts');
});

test('HTTP error without fault body is a communication error and is retried', async () => {
  postImpl = async () => {
    throw httpError(502, '<html>Bad Gateway</html>');
  };
  await assert.rejects(
    makeTransport().send('getOrders', '<xml/>'),
    (err: unknown) => {
      assert.ok(err instanceof MplusApiCommunicationError);
      assert.match(err.message, /HTTP 502/);
      return true;
    },
  );
  assert.equal(postCalls, 3);
});

test('aborted requests are not retried', async () => {
  const controller = new AbortController();
  controller.abort();
  postImpl = async () => {
    throw new AxiosError('canceled', 'ERR_CANCELED');
  };
  const transport = new SoapTransport({
    host: 'test.invalid',
    port: 443,
    ident: 'ident',
    secret: 'secret',
    maxRetries: 2,
    retryDelay: 1,
    signal: controller.signal,
  });
  await assert.rejects(transport.send('getOrders', '<xml/>'), MplusApiCommunicationError);
  assert.equal(postCalls, 1, 'aborted call must not be retried');
});

test('recovers when a retry succeeds', async () => {
  let n = 0;
  postImpl = async () => {
    if (++n < 2) throw new AxiosError('socket hang up', 'ECONNRESET');
    return { data: '<recovered/>' };
  };
  const result = await makeTransport().send('getOrders', '<xml/>');
  assert.equal(result, '<recovered/>');
  assert.equal(postCalls, 2);
});
