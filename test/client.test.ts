import { test, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { MplusKassaClient } from '../src/generated/client';
import { SoapTransport, HttpClient } from '../src/transport';
import { MplusApiDeserializationError } from '../src/errors';

let postedBodies: string[] = [];
let responseXml: string;

const httpStub: HttpClient = async (req) => {
  postedBodies.push(req.body);
  return { status: 200, body: responseXml };
};

beforeEach(() => {
  postedBodies = [];
});

function makeClient() {
  const options = { host: 'test.invalid', port: 443, ident: 'i', secret: 's' };
  const client = new MplusKassaClient(options);
  // Swap in a socket-free transport — these tests exercise (de)serialization,
  // not the HTTP layer (covered by transport.test.ts).
  (client as unknown as { transport: SoapTransport }).transport = new SoapTransport(options, httpStub);
  return client;
}

function envelope(inner: string): string {
  return (
    '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="urn:mplusqapi">' +
    `<SOAP-ENV:Body>${inner}</SOAP-ENV:Body></SOAP-ENV:Envelope>`
  );
}

const createOrderV3Ok = envelope(
  '<ns1:CreateOrderV3Response>' +
  '<ns1:idempotencyResult>IDEMPOTENCY-RESULT-ORIGINAL-RESPONSE</ns1:idempotencyResult>' +
  '<ns1:result>CREATE-ORDER-RESULT-OK</ns1:result>' +
  '</ns1:CreateOrderV3Response>',
);

test('createOrderV3 auto-fills idempotencyKey when absent', async () => {
  responseXml = createOrderV3Ok;
  await makeClient().createOrderV3({ order: { extOrderId: 'ext-1' } });
  assert.equal(postedBodies.length, 1);
  const m = postedBodies[0].match(/<ns1:idempotencyKey>([^<]+)<\/ns1:idempotencyKey>/);
  assert.ok(m, 'idempotencyKey must be auto-generated');
  assert.match(m![1], /^[0-9a-f-]{36}$/, 'auto key is a UUID');
});

test('createOrderV3 preserves a caller-provided idempotencyKey', async () => {
  responseXml = createOrderV3Ok;
  await makeClient().createOrderV3({ idempotencyKey: 'my-key', order: {} });
  assert.ok(postedBodies[0].includes('<ns1:idempotencyKey>my-key</ns1:idempotencyKey>'));
  assert.equal((postedBodies[0].match(/idempotencyKey>/g) ?? []).length, 2, 'exactly one key element');
});

test('absent optional complex response fields stay undefined (no fabricated objects)', async () => {
  responseXml = createOrderV3Ok;
  const resp = await makeClient().createOrderV3({ order: {} });
  assert.equal(resp.result, 'CREATE-ORDER-RESULT-OK');
  assert.equal(resp.order, undefined);
  assert.equal(resp.info, undefined);
});

test('missing required response field throws MplusApiDeserializationError', async () => {
  // result element omitted entirely
  responseXml = envelope(
    '<ns1:CreateOrderV3Response>' +
    '<ns1:idempotencyResult>IDEMPOTENCY-RESULT-ORIGINAL-RESPONSE</ns1:idempotencyResult>' +
    '</ns1:CreateOrderV3Response>',
  );
  await assert.rejects(
    makeClient().createOrderV3({ order: {} }),
    (err: unknown) => {
      assert.ok(err instanceof MplusApiDeserializationError);
      assert.match(err.message, /Missing required field 'result'/);
      return true;
    },
  );
});

test('getRelation NOT-FOUND leaves relation undefined', async () => {
  responseXml = envelope(
    '<ns1:GetRelationResponse>' +
    '<ns1:result>GET-RELATION-RESULT-NOT-FOUND</ns1:result>' +
    '</ns1:GetRelationResponse>',
  );
  const resp = await makeClient().getRelation(99);
  assert.equal(resp.result, 'GET-RELATION-RESULT-NOT-FOUND');
  assert.equal(resp.relation, undefined);
});
