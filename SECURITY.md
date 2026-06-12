# Security Policy

## Supported versions

Only the latest published version receives security fixes.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Use [GitHub private vulnerability reporting](https://github.com/izak0s/mplusqapi-node/security/advisories/new) (Security tab → "Report a vulnerability"). You should receive a response within a few days.

## Scope notes

- This library talks to the MplusKASSA API with credentials passed as URL query parameters — that is how the upstream API works and is out of this project's control. Treat your `ident`/`secret` accordingly (they may end up in proxy/server logs).
- Error objects (`MplusApiError`) carry raw request/response XML for debugging. Scrub them before pasting into logs, issues, or anything public.
