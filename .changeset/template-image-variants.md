---
'@passmint/node': minor
---

Add template image variants. `templates.uploadImage(id, slot, data, { variant })` uploads a PNG/JPEG (`Uint8Array`, `ArrayBuffer` or `Buffer`, base64-encoded without depending on `Buffer`, so it works on Workers) and `templates.deleteImage(id, slot, { variant })` removes one. `passes.create` and `passes.update` accept `imageVariant` (`null` on update clears it). `Pass` gains `image_variant`, `Template` gains `image_variants`, and the `TemplateImage`, `TemplateImageSlot`, `VariantImageSlot` and `TemplateImageOptions` types are exported.

Also add the optional `changeMessage` to `TemplateField`: a `%@` format string that makes Apple Wallet show a lock-screen notification when the field changes on update.

Add per-pass images. `passes.uploadImage(id, slot, data)` gives one pass its own `strip`, `thumbnail` or `background` image (PNG/JPEG/WebP, up to 8 MB), overriding its variant and template image, and `passes.deleteImage(id, slot)` removes it. Both return the updated `Pass`. `Pass` gains `images`, which reports whether each resolved slot comes from the pass, its variant or the template, and `EventPass` gains `image_variant`. The `PassImageSlot`, `PassImageSource` and `PassImages` types are exported.
