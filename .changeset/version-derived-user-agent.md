---
'@passmint/node': patch
---

The `User-Agent` header is now derived from the package version instead of a hardcoded string (it had drifted to `passmint-node/0.1.0`). `src/version.ts` is regenerated automatically during `version-packages`, a unit test fails if it ever drifts from `package.json`, and the SDK now exports `VERSION`.
