---
'@passmint/node': minor
---

Response types are now derived from the API's OpenAPI spec. Every 0.4.0 type name is still exported. A few types, such as `TemplateDesign` and `PassImages`, are still hand-written.

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
