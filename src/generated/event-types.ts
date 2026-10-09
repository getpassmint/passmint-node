// Generated from openapi.json by scripts/gen-event-types.mjs. Do not edit.

/**
 * The Passmint Spec v1 — canonical lifecycle event types delivered to
 * webhooks and returned by GET /v1/events. Platform detail lives in `source`.
 */
export const PASSMINT_EVENT_TYPES = [
  "pass.issued",
  "pass.add_intent",
  "pass.added_to_wallet",
  "pass.update_pushed",
  "pass.update_delivered",
  "pass.update_failed",
  "pass.removed",
  "pass.voided",
  "pass.redeemed",
  "template.republished",
] as const

/** A canonical lifecycle event type (one of `PASSMINT_EVENT_TYPES`). */
export type PassmintEventType = (typeof PASSMINT_EVENT_TYPES)[number]
