# @passmint/node

## 0.6.0

### Minor Changes

- 7ae07b8: Type `design.google` on templates: `loyaltyPoints` and `secondaryLoyaltyPoints` (`{ fieldKey, label }`) show a template field as the Google Wallet loyalty balance, and `accountNameFieldKey` picks the field shown as the card holder's name. New exported types: `TemplateDesignGoogle`, and `TemplateLocation` (already used by `TemplateDesign.locations`, now importable by name).

## 0.5.0

### Minor Changes

- 67231a6: Response types are now derived from the API's OpenAPI spec. Every 0.4.0 type name is still exported. A few types, such as `TemplateDesign` and `PassImages`, are still hand-written.

  New:

  - `passes.createDownloadLink()` and `passes.redemptions()`.
  - `startingAfter` on list methods, and `listAll()` auto-pagination on `passes`, `templates`, `webhooks` and `events`, plus `passes.listAllEvents()` and `webhooks.listAllDeliveries()`.
  - `templates.list()` takes `includeArchived`, `limit` and `startingAfter`.
  - Types for `issuerName`, `locations` and `relevantDate` on template designs, `redemption_policy`, `require_download_link`, the `delivery` and `warnings` fields on pass updates, `warnings` on pass voids and on templates.
  - The `pass.update_failed` and `pass.redeemed` webhook events.
  - `PassEventType` is a new export.

  Runtime change: `PASSMINT_EVENT_TYPES` now has 9 entries (adds `pass.update_failed` and `pass.redeemed`). Code that subscribes webhooks with `events: [...PASSMINT_EVENT_TYPES]` will start receiving those events.

  Type-level changes:

  - Response types gained fields the API was already returning, for example `Pass.redeemed_count` and `Account.plan`. Reading and casting are unaffected, but object literals you type as `Pass`, `Template` or `Account` by hand need the new fields.
  - Event type unions gained `pass.update_failed` and `pass.redeemed`, and `PassEvent['type']` gained `update_failed`, `redeemed`, `download_link_created` and `update_not_delivered`. Exhaustive switches and `Record<PassmintEventType, …>` maps will flag the new members.
  - `Pass.field_values` and `Account.organization_slug` keep their 0.4.0 types for compatibility; see their docs for what the API can actually return.
  - Exported response types are now type aliases rather than interfaces. `extends` and `implements` still work; declaration merging into them no longer does.

## 0.4.0

### Minor Changes

- 3de93fc: Add template image variants. `templates.uploadImage(id, slot, data, { variant })` uploads a PNG/JPEG (`Uint8Array`, `ArrayBuffer` or `Buffer`, base64-encoded without depending on `Buffer`, so it works on Workers) and `templates.deleteImage(id, slot, { variant })` removes one. `passes.create` and `passes.update` accept `imageVariant` (`null` on update clears it). `Pass` gains `image_variant`, `Template` gains `image_variants`, and the `TemplateImage`, `TemplateImageSlot`, `VariantImageSlot` and `TemplateImageOptions` types are exported.

  Also add the optional `changeMessage` to `TemplateField`: a `%@` format string that makes Apple Wallet show a lock-screen notification when the field changes on update.

  Add per-pass images. `passes.uploadImage(id, slot, data)` gives one pass its own `strip`, `thumbnail` or `background` image (PNG/JPEG/WebP, up to 8 MB), overriding its variant and template image, and `passes.deleteImage(id, slot)` removes it. Both return the updated `Pass`. `Pass` gains `images`, which reports whether each resolved slot comes from the pass, its variant or the template, and `EventPass` gains `image_variant`. The `PassImageSlot`, `PassImageSource` and `PassImages` types are exported.

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
