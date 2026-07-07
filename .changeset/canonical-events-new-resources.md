---
'@passmint/node': minor
---

Catch the SDK up to the current Passmint API (canonical webhook payload cutover, natively-prefixed ids, and the new read/ops endpoints):

- **Canonical events.** `webhooks.constructEvent` now returns the typed canonical envelope (`PassmintEvent`): `pass.*` event types, `api_version`, `livemode`, PII-minimized `data.object.pass`, and `source` attribution. `PASSMINT_EVENT_TYPES` is exported. The old loose `WebhookEvent` type is a deprecated alias.
- **Webhook management.** `passmint.webhooks` gains `create`, `retrieve`, `list`, `update`, `delete`, `backfill`, `deliveries`, and `replayDelivery` wrapping `/v1/webhooks*`.
- **New resources.** `passmint.events.list()` (canonical event stream with filters + `startingAfter` cursor), `passmint.metrics.funnel()`, and `passmint.me.retrieve()`.
- **Type backfills.** `Pass` adds `certificate_set_id`, `platforms`, `platform_status`, `google_wallet_url` and a nullable `download_url`; `Template` adds `platforms`, `certificate_set_id`, `google_issuer_id`; `PassEvent['type']` adds `update_delivered` and `google_save_clicked`; `passes.create` returns issuance `warnings`.
- **New params.** `passes.create` accepts `platforms` and `certificateSetId` (explicit `null` forces the dev cert); `templates.create` accepts `platforms`; `templates.update` accepts `platforms`, `certificateSetId`, `googleIssuerId`.
