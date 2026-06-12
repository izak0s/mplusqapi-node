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
let postHeaders: Array<Record<string, string>> = [];
let postImpl: () => Promise<{ data: string }>;

(axios as { create: unknown }).create = () => ({
  post: (_url: string, _body: string, config?: { headers?: Record<string, string> }) => {
    postCalls++;
    postHeaders.push(config?.headers ?? {});
    return postImpl();
  },
});

beforeEach(() => {
  postCalls = 0;
  postHeaders = [];
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

test('connection-refused errors are retried (request never reached the server)', async () => {
  postImpl = async () => {
    throw new AxiosError('connect ECONNREFUSED', 'ECONNREFUSED');
  };
  await assert.rejects(
    makeTransport().send('getOrders', '<xml/>'),
    MplusApiCommunicationError,
  );
  assert.equal(postCalls, 3, 'maxRetries=2 means 3 total attempts');
});

test('ambiguous network errors are NOT retried for non-idempotent calls', async () => {
  postImpl = async () => {
    throw new AxiosError('socket hang up', 'ECONNRESET');
  };
  await assert.rejects(
    makeTransport().send('createOrder', '<xml/>'),
    (err: unknown) => {
      assert.ok(err instanceof MplusApiCommunicationError);
      assert.equal(err.code, 'ECONNRESET');
      return true;
    },
  );
  assert.equal(postCalls, 1, 'reset after send could mean the order was created — no retry');
});

test('ambiguous network errors ARE retried for idempotent calls', async () => {
  postImpl = async () => {
    throw new AxiosError('socket hang up', 'ECONNRESET');
  };
  await assert.rejects(
    makeTransport().send('createOrderV3', '<xml/>', undefined, true),
    MplusApiCommunicationError,
  );
  assert.equal(postCalls, 3);
});

test('HTTP error without fault body is not retried for non-idempotent calls', async () => {
  postImpl = async () => {
    throw httpError(502, '<html>Bad Gateway</html>');
  };
  await assert.rejects(
    makeTransport().send('createOrder', '<xml/>'),
    (err: unknown) => {
      assert.ok(err instanceof MplusApiCommunicationError);
      assert.match(err.message, /HTTP 502/);
      assert.equal(err.httpStatus, 502);
      return true;
    },
  );
  assert.equal(postCalls, 1, 'server received the request — retry could duplicate it');
});

test('X-Request-Id is identical across retry attempts', async () => {
  postImpl = async () => {
    throw new AxiosError('connect ECONNREFUSED', 'ECONNREFUSED');
  };
  await assert.rejects(makeTransport().send('getOrders', '<xml/>'));
  assert.equal(postCalls, 3);
  const ids = postHeaders.map((h) => h['X-Request-Id']);
  assert.ok(ids[0], 'request id auto-generated');
  assert.equal(ids[0], ids[1]);
  assert.equal(ids[1], ids[2]);
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
    if (++n < 2) throw new AxiosError('connect ECONNREFUSED', 'ECONNREFUSED');
    return { data: '<recovered/>' };
  };
  const result = await makeTransport().send('getOrders', '<xml/>');
  assert.equal(result, '<recovered/>');
  assert.equal(postCalls, 2);
});
