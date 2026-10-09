---
'@passmint/node': minor
---

Add `templates.republish()` and `templates.retrieveRepublish()` to push a template's current design to passes already issued from it, plus the `TemplateRepublish` and `TemplateRepublishedEvent` types. Existing call shapes are unchanged.

- `templates.republish(id)` sends an `Idempotency-Key` (override with `{ idempotencyKey }`). A 429 `republish_in_progress` throws `PassmintRateLimitError` immediately; the SDK never auto-retries 429s, and this one can last minutes.
- New `template.republished` event type. `PassmintEventType` and `Event['type']` gain it, so exhaustive `switch`es over event types will flag the new case. `PASSMINT_EVENT_TYPES` gains an entry at runtime: code that subscribes with `[...PASSMINT_EVENT_TYPES]` will now receive it. It carries `data.object.template_republish` and no `pass`, so narrow with `event.type === 'template.republished'` and use `TemplateRepublishedEvent`.
- `template.republished` is only delivered to endpoints subscribed to it by name, never to `"*"`, so existing wildcard handlers that read `data.object.pass` keep working.
- `PassDelivery` gains optional `apple.retrying` and `google.retrying`, set when a failed push was queued for automatic retry.
- Server behaviour: `pass.update_failed` now fires only for permanent failures or once retries are exhausted, not for the first transient failure.
