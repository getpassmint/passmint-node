---
'@passmint/node': patch
---

Bind the default `fetch` to `globalThis` so the SDK works on Cloudflare Workers. The client stored the bare `globalThis.fetch` and invoked it as a method (`this.fetchImpl(...)`); workerd requires `fetch` to be called with its own global as the receiver, so every request threw `TypeError: Illegal invocation` unless a custom `fetch` was passed in options. Node's undici is not receiver-sensitive, which is why tests never caught it.
