---
'@passmint/node': minor
---

Types are now generated from the API's OpenAPI spec, so they can no longer drift from what the API returns. Every 0.4.0 type name is still exported.

New:

- `passes.createDownloadLink()` and `passes.redemptions()`.
- `startingAfter` on list methods, and `has_more` now reflects whether another page exists.
- `listAll()` auto-pagination on `passes`, `templates`, `webhooks` and `events`, plus `passes.listAllEvents()` and `webhooks.listAllDeliveries()`.
- `templates.list()` takes `includeArchived`, `limit` and `startingAfter`.
- Types for `issuerName`, `locations` and `relevantDate` on template designs, `redemption_policy`, `require_download_link`, the `delivery` and `warnings` fields on pass updates, `warnings` on pass voids and on templates.
- The `pass.update_failed` and `pass.redeemed` webhook events.

Type-level changes (runtime behaviour is unchanged):

- Response types gained fields the API was already returning, for example `Pass.redeemed_count` and `Account.plan`. Reading and casting are unaffected, but object literals you type as `Pass`, `Template` or `Account` by hand need the new fields.
- Event type unions gained `pass.update_failed` and `pass.redeemed`, and `PassEventType` gained `update_failed`, `redeemed`, `download_link_created` and `update_not_delivered`. Exhaustive switches and `Record<PassmintEventType, …>` maps will flag the new members.
- `Pass.field_values` and `Account.organization_slug` keep their 0.4.0 types for compatibility; see their docs for what the API can actually return.
