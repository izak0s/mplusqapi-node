# mplusqapi-node

A fully-typed TypeScript client for the [MplusKASSA](https://www.mpluskassa.nl) SOAP API (`urn:mplusqapi`), auto-generated from the official WSDL.

> **Community package** — This is not an official MplusKASSA package. It is independently developed and maintained by the community. Use at your own risk. For the official PHP client, see [MplusKASSA/mplusqapi-php](https://github.com/MplusKASSA/mplusqapi-php).

---

## Features

- **342 typed async methods** covering the full MplusKASSA API surface
- **Auto-generated** from the official WSDL URL — regenerate anytime the WSDL changes
- **Fully typed** — 259 enum types and 1200+ interfaces, all derived from the WSDL
- **List flattening** — `*List` wrapper types (e.g. `OrderList`) are transparently unwrapped to plain arrays (`Order[]`)
- **Decimal-safe** — `xsd:decimal` fields typed as `string` to avoid floating-point precision loss
- **Date handling** — `SoapMplusDateTime` structs and ISO date fields both map to `Date`
- **Rich error types** — every error carries `xmlRequest` and `xmlResponse` for easy debugging

---

## Installation

```bash
npm install mplusqapi-node
```

**Runtime dependencies:**
- [`axios`](https://github.com/axios/axios) — HTTP transport
- [`fast-xml-parser`](https://github.com/NaturalIntelligence/fast-xml-parser) — XML parsing

---

## Quick Start

```typescript
import {
  MplusKassaClient,
  MplusApiClientError,
  MplusApiServerError,
  MplusApiCommunicationError,
} from 'mplusqapi-node';

const client = new MplusKassaClient({
  host: 'api.mpluskassa.nl',
  port: 44281,
  ident: 'your-ident',
  secret: 'your-secret',
});

// Fetch API version
const version = await client.getApiVersion();
console.log(`API: ${version.majorNumber}.${version.minorNumber}.${version.revisionNumber}`);

// Fetch orders (returns Order[] directly)
const { orderList } = await client.getOrders({ syncMarkerLimit: 10 });
for (const order of orderList) {
  console.log(order.orderId, order.financialDate);
}

// Fetch a single relation
const { relation } = await client.getRelation(42);
console.log(relation.name, relation.email);
```

---

## Authentication

Credentials are passed as **URL query parameters** (`?ident=X&secret=Y`), not in SOAP headers. Pass them to the constructor:

```typescript
const client = new MplusKassaClient({
  host: 'api.mpluskassa.nl', // hostname only, no protocol
  port: 44281,
  ident: process.env.MPLUS_IDENT!,
  secret: process.env.MPLUS_SECRET!,
  rejectUnauthorized: false, // set to false for self-signed certs (e.g. local test servers)
});
```

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
} from 'mplusqapi-node';

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
import type { OrderType, ArticleType } from 'mplusqapi-node';

const type: OrderType = 'SALES_ORDER';
```

### Decimal fields

Price and quantity fields (`xsd:decimal`) are typed as `string` to preserve precision:

```typescript
const price: string = order.totalPrice; // e.g. "12.50", not 12.5
const amount = parseFloat(price);
```

### Dates

`SoapMplusDateTime` response fields are deserialized to `Date` objects. Pass `Date` objects for request fields that accept dates.

### List fields

`*List` wrapper types are flattened to plain arrays in both requests and responses:

```typescript
// Response: orderList is Order[], not OrderList
const { orderList } = await client.getOrders({});
const first: Order = orderList[0];

// Request: pass an array directly
await client.payTableOrder({
  terminal: myTerminal,
  paymentList: [{ method: 'CASH', amount: '10.00' }],
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
# Regenerate src/generated/ from the official WSDL URL
npm run generate

# Or regenerate from a custom WSDL URL
npm run generate -- 'https://api.mpluskassa.nl:44281/?wsdl'

# Or regenerate from the cached local WSDL
npm run generate:local
```

### Build

```bash
npm run build   # tsc → dist/
```

Output:
```
dist/
  index.js          CommonJS entry point
  index.d.ts        TypeScript declarations
```

### Run the example

```bash
cp .env.example .env  # fill in your credentials
source .env && npx ts-node --project scripts/tsconfig.json example.ts
```

---

## Architecture

```
src/
  index.ts              Public exports
  errors.ts             Error hierarchy
  soap.ts               Envelope builder, response parser, serializers
  transport.ts          HTTP client (axios)
  generated/            Auto-generated — do not edit manually
    types.ts            TypeScript interfaces and string union enums
    serializer.ts       TS objects → SOAP XML
    deserializer.ts     Response XML → typed TS objects
    client.ts           MplusKassaClient with all 342 methods

scripts/
  generate.ts           WSDL parser + code generator
wsdl.xml                Cached WSDL for offline/local regeneration
```

---

## License

MIT
