# Photo extraction and fitting

The studio uses actual pixels from a reference photograph. There is no generative image model or paid AI API.

Nail positions are found automatically with Google's MediaPipe Hand Landmarker (Apache-2.0), which runs entirely in the browser. Its runtime (`@mediapipe/tasks-vision`, pinned to 1.0.1) is bundled by Vite, and the model is served from `public/models/hand_landmarker.task` (float16 v1, SHA-256 `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`). Photos are never sent to another service. About 19 MB of runtime and model downloads the first time the studio fits a hand; the browser caches it afterwards.

The customer does two things: saves a hand photo and chooses a style. Everything else is automatic.

1. **Hand.** The studio detects the customer's hand and estimates each natural nail from the fingertip and last-joint landmarks, then snaps the width and cuticle to colour edges in the photo.
2. **Style.** The six catalog photos and the original 100 inspiration photos have marked nail locations in `src/nail-maps.json`. The 430 newer references use photo detection or the customer's manual nail selection. A photo try-on is a visual guide; Eurie confirms physical sizes before production. On marked references, an outline is traced from the photographed nail; when that trace is uncertain, the marked box is used. Each nail keeps the customer's cuticle position and nail width and takes its length from the reference.

   Photos without marks (the customer's own uploads, or catalog photos replaced by an admin) are matched finger for finger when the photo shows a clear hand that the traced outlines agree with. If not, the customer taps the nail they like once. Close-up nail photos usually need that tap. Searching a whole photo for nails without a hand or a mark was tried and rejected: it picked up skin, shadows and background too often.

Optional controls stay folded away: drag a nail, pick a finger to change one nail (for accent nails), the outline and cuticle curve for all five nails, three-point fitting, and the crop sliders. When no hand is found in the customer's photo, three-point fitting is the fallback. Saving exports only the photo composition, without selection marks. Crop coordinates, outlines and reference identifiers are retained for reopening the preview. Requests sent to the artist include reference names and links in editable design notes.

When a library photo is added or replaced, add or update its entry in `src/nail-maps.json`; coordinates are fractions of the image width and height, and `w` is a fraction of the image width.

Unfitted nails remain invisible. Changing the hand photo resets placements to avoid putting nails at guessed positions on a different hand. Existing previews made with the former illustrated shapes must be fitted again to use photo cutouts.

Automatic fitting works best on a photo of the back of the hand, fingers apart, with all nails visible. A reference taken from a similar angle gives a better result. This is a visual preview and does not measure nail sizes, infer occluded areas, or guarantee a physically accurate reproduction.

Only one uploaded inspiration image is attached to each preview under the existing private storage model. Switching that uploaded reference clears its previous cutouts; public library references can be mixed. Customer photos remain in private storage with the existing access rules.

The library has 100 unique local photo files, source links, category filters, text search, lazy loading and batches of 24 cards. Inspiration photos do not create 100 sale products or change shop prices.
