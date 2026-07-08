# @passmint/node

## 0.3.0

### Minor Changes

- f41b671: Add the optional `headerFields` slot to `TemplateDesign`, so templates created or updated through the SDK can place small fields in the pass header (top-right, next to the logo).

### Patch Changes

- 93c099e: Document the wallet URLs carried on a pass (`url`, `download_url`, `google_wallet_url`) and the "build your own Apple/Google Wallet buttons" fallback pattern in the README, and clarify the JSDoc on those fields so they're self-explanatory in-editor.

## 0.2.2

### Patch Changes

- f8fda7e: Bind the default `fetch` to `globalThis` so the SDK works on Cloudflare Workers. The client stored the bare `globalThis.fetch` and invoked it as a method (`this.fetchImpl(...)`); workerd requires `fetch` to be called with its own global as the receiver, so every request threw `TypeError: Illegal invocation` unless a custom `fetch` was passed in options. Node's undici is not receiver-sensitive, which is why tests never caught it.

## 0.2.1

### Patch Changes

- 26bbc93: The `User-Agent` header is now derived from the package version instead of a hardcoded string (it had drifted to `passmint-node/0.1.0`). `src/version.ts` is regenerated automatically during `version-packages`, a unit test fails if it ever drifts from `package.json`, and the SDK now exports `VERSION`.

## 0.2.0

### Minor Changes

- dd9ac5d: Catch the SDK up to the current Passmint API (canonical webhook payload cutover, natively-prefixed ids, and the new read/ops endpoints):

  - **Canonical events.** `webhooks.constructEvent` now returns the typed canonical envelope (`PassmintEvent`): `pass.*` event types, `api_version`, `livemode`, PII-minimized `data.object.pass`, and `source` attribution. `PASSMINT_EVENT_TYPES` is exported. The old loose `WebhookEvent` type is a deprecated alias.
  - **Webhook management.** `passmint.webhooks` gains `create`, `retrieve`, `list`, `update`, `delete`, `backfill`, `deliveries`, and `replayDelivery` wrapping `/v1/webhooks*`.
  - **New resources.** `passmint.events.list()` (canonical event stream with filters + `startingAfter` cursor), `passmint.metrics.funnel()`, and `passmint.me.retrieve()`.
  - **Type backfills.** `Pass` adds `certificate_set_id`, `platforms`, `platform_status`, `google_wallet_url` and a nullable `download_url`; `Template` adds `platforms`, `certificate_set_id`, `google_issuer_id`; `PassEvent['type']` adds `update_delivered` and `google_save_clicked`; `passes.create` returns issuance `warnings`.
  - **New params.** `passes.create` accepts `platforms` and `certificateSetId` (explicit `null` forces the dev cert); `templates.create` accepts `platforms`; `templates.update` accepts `platforms`, `certificateSetId`, `googleIssuerId`.
