import type { DrawTransform } from "@/lib/pvc-cards/raster";

/**
 * A card photo that has been decoded in the browser. The bitmap never leaves
 * the device - these are identity documents.
 */
export type LoadedImage = {
  id: string;
  name: string;
  bitmap: ImageBitmap;
  /** Natural pixel size of the photo, before rotation. */
  width: number;
  height: number;
  /** Extra rotation the operator applied on top of the automatic one. */
  rotate: 0 | 90 | 180 | 270;
  mirror: boolean;
};

export type { DrawTransform };
