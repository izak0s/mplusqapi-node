# mplusqapi-node

[![CI](https://github.com/izak0s/mplusqapi-node/actions/workflows/ci.yml/badge.svg)](https://github.com/izak0s/mplusqapi-node/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40izak0s%2Fmplusqapi-node)](https://www.npmjs.com/package/@izak0s/mplusqapi-node)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A fully-typed TypeScript client for the [MplusKASSA](https://www.mpluskassa.nl) SOAP API (`urn:mplusqapi`), auto-generated from the official WSDL.

> **Community package** — This is not an official MplusKASSA package. It is independently developed and maintained by the community. Use at your own risk. For the official PHP client, see [MplusKASSA/mplusqapi-php](https://github.com/MplusKASSA/mplusqapi-php).

---

## Features

- **372 typed async methods** covering the full MplusKASSA API surface
- **Auto-generated** from the official WSDL URL — regenerate anytime the WSDL changes
- **Fully typed** — 286 enum types and 1341 interfaces, all derived from the WSDL
- **List flattening** — `*List` wrapper types (e.g. `OrderList`) are transparently unwrapped to plain arrays (`Order[]`)
- **Decimal-safe** — `xsd:decimal` fields typed as `string` to avoid floating-point precision loss
- **Date handling** — `SoapMplusDateTime` structs and ISO date fields both map to `Date`
- **Rich error types** — errors carry the raw `xmlRequest` / `xmlResponse` (where available) for easy debugging
- **Dual module** — ships both ESM and CommonJS builds with type declarations for each

---

## Installation

```bash
npm install @izak0s/mplusqapi-node
```

**Runtime dependencies:**
- [`fast-xml-parser`](https://github.com/NaturalIntelligence/fast-xml-parser) — XML parsing

HTTP uses the built-in `node:https` module — no HTTP client dependency.

---

## Quick Start

```typescript
import {
  MplusKassaClient,
  MplusApiClientError,
  MplusApiServerError,
  MplusApiCommunicationError,
} from '@izak0s/mplusqapi-node';

const client = new MplusKassaClient({
  host: process.env.MPLUS_HOST!,
  port: Number(process.env.MPLUS_PORT!),
  ident: process.env.MPLUS_IDENT!,
  secret: process.env.MPLUS_SECRET!,
});

async function main() {
  // Fetch API version
  const version = await client.getApiVersion();
  console.log(`API: ${version.majorNumber}.${version.minorNumber}.${version.revisionNumber}`);

  // Fetch orders (returns Order[] directly — list wrappers are unwrapped)
  const orders = await client.getOrders({ syncMarker: 0, syncMarkerLimit: 10 });
  for (const order of orders) {
    console.log(order.orderId, order.financialDate);
  }

  // Fetch a single relation — `relation` is undefined when result is NOT-FOUND
  const { result, relation } = await client.getRelation(42);
  if (result === 'GET-RELATION-RESULT-OK') {
    console.log(relation?.name, relation?.email);
  }
}

main().catch(console.error);
```

---

## Authentication

Credentials are passed as **URL query parameters** (`?ident=X&secret=Y`), not in SOAP headers. Pass them to the constructor:

```typescript
const client = new MplusKassaClient({
  host: process.env.MPLUS_HOST!, // hostname only, no protocol
  port: Number(process.env.MPLUS_PORT!),
  ident: process.env.MPLUS_IDENT!,
  secret: process.env.MPLUS_SECRET!,
});
```

### Transport options

| Option | Default | Description |
|---|---|---|
| `timeout` | `30` | Request timeout in seconds |
| `maxRetries` | `3` | Retry attempts on retryable transport errors (see below; SOAP faults are never retried) |
| `retryDelay` | `500` | Base retry delay in ms, doubled per attempt (exponential backoff with jitter) |
| `timezone` | `'Europe/Amsterdam'` | IANA zone used to interpret/emit the API's wall-clock date structs (see [Dates](#dates)) |
| `signal` | — | `AbortSignal` to cancel all in-flight requests from this client (e.g. on shutdown) |

### Retries and idempotency

Retrying a mutation after an ambiguous network failure (e.g. a connection reset after the request was sent) could execute it twice — duplicate orders, double payments. The client guards against this:

- **Idempotent operations** (requests carrying an `idempotencyKey`, e.g. `createOrderV3`, `payOrderV2`): the key is **auto-generated** (UUID) when you don't provide one, and any transport error is retried freely — the server deduplicates by key. Provide your own key to make retries safe across process restarts.
- **All other operations**: only errors where the request provably never reached the server are retried (`ECONNREFUSED`, `ENOTFOUND`, DNS failures, unreachable host/network). Timeouts, connection resets, and HTTP 5xx responses are **not** retried — inspect `MplusApiCommunicationError.code` / `.httpStatus` and decide yourself.

All attempts of one call share the same `X-Request-Id` header.

### Response guarantees

- List fields are always present on responses (`[]` when the server omits them).
- Complex response fields (e.g. `GetRelationResponse.relation`) are `undefined` when the server omits them — check the accompanying `result` field.
- A required scalar field missing from a response throws `MplusApiDeserializationError` instead of silently producing `''`/`NaN`/`false`.

---

## Error Handling

All errors extend `MplusApiError` and carry the raw XML for debugging:

```typescript
import {
  MplusApiClientError,      // SOAP fault with Client.* faultcode
  MplusApiServerError,      // SOAP fault with Server.* faultcode
  MplusApiCommunicationError, // network / HTTP error
  MplusApiSerializationError, // failed to build request XML
  MplusApiDeserializationError, // failed to parse response XML
} from '@izak0s/mplusqapi-node';

try {
  await client.getOrder('invalid-id');
} catch (err) {
  if (err instanceof MplusApiClientError) {
    console.error(`Client fault [${err.faultCode}]: ${err.message}`);
    console.error('Request XML:', err.xmlRequest);
    console.error('Response XML:', err.xmlResponse);
  } else if (err instanceof MplusApiServerError) {
    console.error(`Server fault [${err.faultCode}]: ${err.message}`);
  } else if (err instanceof MplusApiCommunicationError) {
    console.error(`Network error: ${err.message}`);
  }
}
```

---

## Type System

### Enums

Enum fields are typed as TypeScript string unions:

```typescript
import type { OrderType, ArticleType } from '@izak0s/mplusqapi-node';

const type: OrderType = 'ORDER-TYPE-SALES-ORDER';
```

### Money and decimal fields

The WSDL uses two conventions for money/quantity values, and the generated types mirror them faithfully:

- **`xsd:decimal` → `string`** — fractional values like `"12.50"`. Kept as strings end-to-end to preserve precision (the XML parser is configured to never coerce them to floats).
- **`xsd:long` → `number`** — scaled integers, typically cents (look for sibling fields like `minimumAmountDecimalPlaces`). Safe as JS numbers.

```typescript
// xsd:decimal — string, e.g. SalesLineContractLine
const price: string = contractLine.priceIncl; // "12.50", not 12.5

// xsd:long — integer cents, e.g. Payment
const payment = { method: 'CASH', amount: 1000 }; // €10.00
```

The same field name (e.g. `priceIncl`) can be a `string` on one type and a `number` on another — trust the TypeScript type, it reflects what the API sends.

### Dates

The API has two date structs, handled differently:

**`SoapMplusDateTime`** (full timestamp) — carries its own UTC offset (`timezone`, in minutes). Deserialized to an exact `Date` using that offset, independent of host or config:

```typescript
// struct { year:2026, mon:6, day:12, hour:13, min:45, sec:30, timezone:120 }
// -> 2026-06-12T11:45:30.000Z   (exact instant; +120 min == +02:00)
```

If a `SoapMplusDateTime` ever omits its offset, the client's configured `timezone` (default `Europe/Amsterdam`) is used as a fallback to interpret the wall-clock. The configured zone is also used when **serializing** outbound timestamps (to fill `timezone`/`isdst`).

**`SoapMplusDate`** (calendar date, e.g. `financialDate`) — has only day/mon/year, no time and no offset. Deserialized to **UTC midnight**, so it reads as the intended calendar date with no off-by-one:

```typescript
// struct { year:2018, mon:6, day:18 }  ->  2018-06-18T00:00:00.000Z
order.financialDate?.toISOString().slice(0, 10);   // '2018-06-18'
order.financialDate?.getUTCDate();                 // 18
```

> Read date-only fields with the **UTC** accessors (`getUTCFullYear/Month/Date`) or `.toISOString().slice(0, 10)` — not `getDate()`/`toLocaleDateString()`, which shift by your host's zone. When **sending** a date-only field, build a UTC-midnight `Date`: `new Date('2018-06-18')` or `new Date(Date.UTC(y, m - 1, d))`.

> **Note:** the configured `timezone` is process-wide — constructing multiple clients with different `timezone` values in one process is not supported. `setTimeZone(tz)` / `getTimeZone()` are also exported for direct control.

### List fields

`*List` wrapper types are flattened to plain arrays in both requests and responses:

```typescript
// Response: getOrders returns Order[] directly, not { orderList: ... }
const orders = await client.getOrders({});
const first: Order = orders[0];

// Request: pass an array directly
await client.payTableOrder({
  terminal: { branchNumber: 1, terminalNumber: 40 },
  paymentList: [{ method: 'CASH', amount: 1000 }], // amount in cents
});
```

### Request input types

Request parameters use `Input<T>` — a deep-partial variant of the response types. All fields are optional when building requests; fields the WSDL marks required describe what *responses* are guaranteed to contain (e.g. `Order.orderId` is assigned by the server on create). Omitted fields are simply not serialized. The server validates true requirements at runtime and responds with a SOAP fault.

```typescript
// Order without orderId — server assigns it
await client.createOrderV3({
  order: { lineList: [{ articleNumber: 123, data: { quantity: 1 } }] },
});
```

---

## Request tracing

Pass an optional `requestId` as the last argument to any method for correlation logging:

```typescript
const result = await client.getRelations({ syncMarker: 0 }, 'req-abc-123');
```

The ID is sent as the `X-Request-Id` header.

---

## Development

### Regenerate from WSDL

```bash
# Regenerate src/generated/ from the latest public WSDL
# (MplusKASSA's GitHub release — the default source, no arguments needed)
npm run generate

# Or from an explicit WSDL URL
npm run generate -- 'https://example/path/to/mplusqapi.wsdl'

# Or keep a URL out of shell history with an environment variable
MPLUS_WSDL_URL='https://example/path/to/mplusqapi.wsdl' npm run generate

# Or regenerate from the cached local WSDL
npm run generate:local
```

### Build

```bash
npm run build   # tsup → dist/ (bundled CJS + ESM + declarations)
```

Output:
```
dist/
  index.js    / index.d.ts     CommonJS entry + declarations
  index.mjs   / index.d.mts    ESM entry + declarations
```

### Test

```bash
npm test            # node:test suite (test/)
npm run test:types  # tsc --noEmit over src + test
npm run check       # build + both of the above (what CI runs)
```

### Release

```bash
npm version patch   # or minor / major — bumps package.json, commits, tags
git push --follow-tags
```

The tag triggers `.github/workflows/publish.yml`: it first runs the full CI workflow (build, type-check, tests across the Node matrix, pack check) as a gate, then — only if CI passes — publishes to npm via [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, no token) and creates a GitHub release with generated notes. The workflow refuses to publish if the tag doesn't match `package.json`.

### Run the example

```bash
cp examples/.env.example .env  # fill in your credentials
source .env && npx ts-node --project scripts/tsconfig.json examples/basic.ts
```

---

## Architecture

```
src/
  index.ts              Public exports
  errors.ts             Error hierarchy
  soap.ts               Envelope builder, response parser, serializers
  transport.ts          HTTP client (node:https), retries, error mapping
  generated/            Auto-generated — do not edit manually
    types.ts            TypeScript interfaces and string union enums
    serializer.ts       TS objects → SOAP XML
    deserializer.ts     Response XML → typed TS objects
    client.ts           MplusKassaClient with all 372 methods

scripts/
  generate.ts           WSDL parser + code generator
wsdl.xml                Cached WSDL for offline/local regeneration
                        (gitignored — save the WSDL here to use `generate:local`;
                        otherwise `npm run generate` needs no local cache)
```

---

## Contributing & security

See [CONTRIBUTING.md](CONTRIBUTING.md). Vulnerabilities: report privately via [SECURITY.md](SECURITY.md), not public issues.

---

## License

[MIT](LICENSE)
