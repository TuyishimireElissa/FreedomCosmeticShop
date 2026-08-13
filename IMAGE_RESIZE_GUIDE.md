# Product image sizing

## What was wrong

Reported as "unequal product photo sizes". The card **containers** were never
the problem — `ProductCard` has always used a fixed `aspect-[4/5]` box, so every
card in a grid was already the same size. The **images inside them** were not.

`optimizeCloudinaryUrl` emitted `w_500,c_fill,g_auto` with **no height**.
Without a target height `c_fill` cannot crop to a box; it only scales. Measured
on live product images:

| Source | Delivered | Ratio |
|---|---|---|
| 480 × 359 | 500 × 374 | 1.34 |
| 1024 × 1024 | 500 × 500 | 1.00 |

Both then landed in the same 4:5 container with `object-contain` and `p-4`. The
wide one shrank to a letterboxed sliver; the square one nearly filled the frame.

Of 14 sampled live images: **11 square, 3 landscape** (widest 1.73).

## The fix

`w_N,h_N×1.25,c_pad,b_auto` — pin height as well as width, and **pad** to reach
the ratio. Every product image now arrives at exactly 4:5, so the card uses
`object-cover` and fills the frame with nothing cut off.

Applies to product cards only, via `productCardImageUrl` / `productCardSrcSet`.
Hero banners and category tiles keep the plain width-only transform — forcing
4:5 on a 16:9 banner would letterbox it.

## Why pad rather than crop

`c_fill` would also give a uniform ratio, but on the measured 1.73-wide image it
discards ~54% of the frame. Verified visually on a real product: crop sliced the
*"fresh / ANTI-BACTERIAL"* wording off a Dettol pack; pad kept the whole thing.
For cosmetics the label and bottle silhouette are the recognition cue.

`b_auto` samples the edge colour so the padding reads as background, not a grey
box.

**Cost:** 20 kB vs 17 kB on the wide image; 24 kB unchanged on a square one.

## Why 4:5 and not 3:4

3:4 is the Sephora/Ulta convention, but this catalogue is overwhelmingly square
(11 of 14 sampled). A taller box shrinks every square photo on screen for no
gain. 4:5 also matches the container already in use, so nothing else moved.

## No re-upload was needed

Cloudinary transforms at delivery, so all 106 existing images were fixed without
touching storage. **No batch script, no re-upload, no risk to originals.**

## If you ever do want physically resized files

Not recommended — the delivery transform already does this, and re-uploading
106 images risks the originals for no visible gain. If it is ever required:

1. **Back up every original first.** Cloudinary keeps them, but export anyway.
2. Sharp is already a dependency (`0.35.3`), so no install is needed.
3. Download each `Product.images[0]`, then
   `sharp(buf).resize(600, 750, { fit: 'contain', background: <edge colour> })`
   — `contain`, never `cover`, for the reason above.
4. Upload as a **new** Cloudinary public id. Do not overwrite; a bad batch is
   then a database revert rather than lost artwork.
5. Update `Product.images` only after spot-checking a sample.

## For new uploads

Any shape works — delivery normalises it. For the best result upload **square or
portrait** images with the product centred and a plain background. Very wide
photos will show padding bars at the top and bottom.
