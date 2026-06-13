import { test, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { SoapTransport, HttpClient, HttpRequest, HttpResponse } from '../src/transport';
import {
  MplusApiClientError,
  MplusApiServerError,
  MplusApiCommunicationError,
} from '../src/errors';

// SoapTransport takes an injectable HttpClient; stub it so tests never touch a socket.
let postCalls = 0;
let postHeaders: Array<Record<string, string>> = [];
let httpImpl: (req: HttpRequest) => Promise<HttpResponse>;

const httpStub: HttpClient = (req) => {
  postCalls++;
  postHeaders.push(req.headers);
  return httpImpl(req);
};

beforeEach(() => {
  postCalls = 0;
  postHeaders = [];
});

function makeTransport(signal?: AbortSignal) {
  return new SoapTransport({
    host: 'test.invalid',
    port: 443,
    ident: 'ident',
    secret: 'secret',
    maxRetries: 2,
    retryDelay: 1,
    signal,
  }, httpStub);
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

/** A transport-level failure carrying a low-level error code (no response received). */
function codedError(code: string, message = code): NodeJS.ErrnoException {
  const e = new Error(message) as NodeJS.ErrnoException;
  e.code = code;
  return e;
}

test('send returns response body on success', async () => {
  httpImpl = async () => ({ status: 200, body: '<ok/>' });
  const result = await makeTransport().send('getApiVersion', '<xml/>');
  assert.equal(result, '<ok/>');
  assert.equal(postCalls, 1);
});

test('HTTP error with Client.* fault throws MplusApiClientError without retry', async () => {
  httpImpl = async () => ({ status: 500, body: faultEnvelope('Client.ORDER_NOT_FOUND', 'Order not found') });
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
  httpImpl = async () => ({ status: 500, body: faultEnvelope('Server.INTERNAL', 'boom') });
  await assert.rejects(makeTransport().send('getOrder', '<xml/>'), MplusApiServerError);
  assert.equal(postCalls, 1);
});

test('connection-refused errors are retried (request never reached the server)', async () => {
  httpImpl = async () => { throw codedError('ECONNREFUSED', 'connect ECONNREFUSED'); };
  await assert.rejects(
    makeTransport().send('getOrders', '<xml/>'),
    MplusApiCommunicationError,
  );
  assert.equal(postCalls, 3, 'maxRetries=2 means 3 total attempts');
});

test('ambiguous network errors are NOT retried for non-idempotent calls', async () => {
  httpImpl = async () => { throw codedError('ECONNRESET', 'socket hang up'); };
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
  httpImpl = async () => { throw codedError('ECONNRESET', 'socket hang up'); };
  await assert.rejects(
    makeTransport().send('createOrderV3', '<xml/>', undefined, true),
    MplusApiCommunicationError,
  );
  assert.equal(postCalls, 3);
});

test('HTTP error without fault body is not retried for non-idempotent calls', async () => {
  httpImpl = async () => ({ status: 502, body: '<html>Bad Gateway</html>' });
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
  httpImpl = async () => { throw codedError('ECONNREFUSED', 'connect ECONNREFUSED'); };
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
  httpImpl = async () => { throw codedError('ABORT_ERR', 'Request aborted'); };
  await assert.rejects(makeTransport(controller.signal).send('getOrders', '<xml/>'), MplusApiCommunicationError);
  assert.equal(postCalls, 1, 'aborted call must not be retried');
});

test('recovers when a retry succeeds', async () => {
  let n = 0;
  httpImpl = async () => {
    if (++n < 2) throw codedError('ECONNREFUSED', 'connect ECONNREFUSED');
    return { status: 200, body: '<recovered/>' };
  };
  const result = await makeTransport().send('getOrders', '<xml/>');
  assert.equal(result, '<recovered/>');
  assert.equal(postCalls, 2);
});
