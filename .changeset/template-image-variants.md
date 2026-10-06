---
'@passmint/node': minor
---

Add template image variants. `templates.uploadImage(id, slot, data, { variant })` uploads a PNG/JPEG (`Uint8Array`, `ArrayBuffer` or `Buffer`, base64-encoded without depending on `Buffer`, so it works on Workers) and `templates.deleteImage(id, slot, { variant })` removes one. `passes.create` and `passes.update` accept `imageVariant` (`null` on update clears it). `Pass` gains `image_variant`, `Template` gains `image_variants`, and the `TemplateImage`, `TemplateImageSlot`, `VariantImageSlot` and `TemplateImageOptions` types are exported.
