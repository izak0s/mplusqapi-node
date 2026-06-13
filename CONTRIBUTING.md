# Contributing

## Setup

```bash
npm ci
```

`wsdl.xml` is gitignored. To regenerate `src/generated/` you need it once:

```bash
npm run generate -- '<wsdl-url>'   # fetches + regenerates (ask a maintainer for the URL)
npm run generate:local             # afterwards: regenerate from the cached wsdl.xml
```

## Golden rule: never edit `src/generated/`

`types.ts`, `serializer.ts`, `deserializer.ts`, and `client.ts` are generated. Change `scripts/generate.ts` instead, regenerate, and add a unit test in `test/generator.test.ts` pinning the new behavior.

## Commands

```bash
npm run build       # tsup → dist/ (CJS + ESM + d.ts)
npm run test:types  # tsc --noEmit over src + test + scripts
npm test            # node:test suite
npm run check       # all of the above — what CI runs
```

## Pull requests

- Keep PRs focused; one concern per PR.
- New behavior needs a test. Bug fixes need a test that fails without the fix.
- CI (build, types, tests on Node 20/22/24) must pass.
- Don't bump the version in PRs — releases are tagged by maintainers via `npm version`.

## Reporting bugs

Use the issue template. Include the operation name, library version, and the error output — but scrub `xmlRequest`/`xmlResponse` and any real order/relation data before posting.
