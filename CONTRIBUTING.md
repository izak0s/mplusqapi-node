# Contributing

## Setup

```bash
npm ci
```

## Regenerate `src/generated/`

```bash
npm run generate                 # default: latest public WSDL (MplusKASSA GitHub release)
npm run generate -- '<wsdl-url>' # explicit URL
npm run generate:local           # from the cached local wsdl.xml (gitignored; save one there first)
```

The default source is `PUBLIC_WSDL_URL` in `scripts/generate.ts` (the public release WSDL). The nightly `wsdl-sync.yml` uses this default and opens a PR on `auto/wsdl-update` when upstream changes.

## Golden rule: never edit `src/generated/`

`types.ts`, `serializer.ts`, `deserializer.ts`, and `client.ts` are generated. Change `scripts/generate.ts` instead, regenerate, and add a unit test in `test/generator.test.ts` pinning the new behavior.

## Commands

```bash
npm run build       # tsup → dist/ (CJS + ESM + d.ts)
npm run test:types  # tsc --noEmit over src + test + scripts
npm test            # node:test suite
npm run check       # all of the above — what CI runs
```

## Source layout

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
    client.ts           MplusKassaClient with all methods
scripts/
  generate.ts           WSDL parser + code generator
  sync-readme.ts        Updates the method/enum/interface counts in README
wsdl.xml                Gitignored local WSDL cache for `generate:local`
```

Run the example against a live server:

```bash
cp examples/.env.example .env  # fill in your credentials
source .env && npx ts-node --project scripts/tsconfig.json examples/basic.ts
```

## Pull requests

- Keep PRs focused; one concern per PR.
- New behavior needs a test. Bug fixes need a test that fails without the fix.
- CI (build, types, tests on Node 20/22/24) must pass.
- Don't bump the version in PRs. Releases are tagged by maintainers via `npm version`; merging the nightly `auto/wsdl-update` PR auto-bumps the minor version and publishes.

## Reporting bugs

Use the issue template. Include the operation name, library version, and the error output — but scrub `xmlRequest`/`xmlResponse` and any real order/relation data before posting.
