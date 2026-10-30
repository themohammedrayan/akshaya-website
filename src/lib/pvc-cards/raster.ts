import type { FitMode } from "./types";

/** Anything the canvas can draw: an <img>, an ImageBitmap, or a canvas. */
export type DrawableSource = CanvasImageSource & { width: number; height: number };

export type DrawTransform = {
  /** Clockwise rotation in degrees. */
  rotate: 0 | 90 | 180 | 270;
  /** Flip horizontally, for cards printed back to back. */
  mirror: boolean;
};

/** A region of the source image, in the source's own pixels. */
export type CropRect = { x: number; y: number; width: number; height: number };

type Rect = { x: number; y: number; width: number; height: number };

/**
 * The source region of interest, expressed in "oriented" coordinates - the
 * coordinates of the image after it has been rotated.
 */
function cropInOrientedSpace(crop: CropRect, width: number, height: number, rotate: number): Rect {
  switch (rotate) {
    case 90:
      return { x: height - (crop.y + crop.height), y: crop.x, width: crop.height, height: crop.width };
    case 180:
      return {
        x: width - (crop.x + crop.width),
        y: height - (crop.y + crop.height),
        width: crop.width,
        height: crop.height,
      };
    case 270:
      return { x: crop.y, y: width - (crop.x + crop.width), width: crop.height, height: crop.width };
    default:
      return { ...crop };
  }
}

/**
 * Picks the part of the oriented crop to sample, and where it lands on the
 * card.
 *
 * "cover" keeps the largest region with the destination's aspect ratio (so the
 * card is always filled and the overflow is cropped away); "contain" keeps
 * everything and leaves white bars; "stretch" keeps everything and distorts it.
 */
function selectRegion(
  oriented: Rect,
  destinationWidth: number,
  destinationHeight: number,
  fit: FitMode,
): { region: Rect; destX: number; destY: number; destWidth: number; destHeight: number } {
  if (fit === "stretch") {
    return {
      region: oriented,
      destX: 0,
      destY: 0,
      destWidth: destinationWidth,
      destHeight: destinationHeight,
    };
  }

  if (fit === "contain") {
    const scale = Math.min(destinationWidth / oriented.width, destinationHeight / oriented.height);
    const destWidth = oriented.width * scale;
    const destHeight = oriented.height * scale;
    return {
      region: oriented,
      destX: (destinationWidth - destWidth) / 2,
      destY: (destinationHeight - destHeight) / 2,
      destWidth,
      destHeight,
    };
  }

  // cover: centre-crop the oriented region to the destination's aspect ratio.
  const targetAspect = destinationWidth / destinationHeight;
  const regionAspect = oriented.width / oriented.height;
  let region = oriented;
  if (regionAspect > targetAspect) {
    const width = oriented.height * targetAspect;
    region = { ...oriented, x: oriented.x + (oriented.width - width) / 2, width };
  } else {
    const height = oriented.width / targetAspect;
    region = { ...oriented, y: oriented.y + (oriented.height - height) / 2, height };
  }
  return { region, destX: 0, destY: 0, destWidth: destinationWidth, destHeight: destinationHeight };
}

/**
 * The canvas transform that puts the source image into the card.
 *
 * The region is expressed in "oriented" coordinates - the coordinates of the
 * image after it has been rotated - so these formulas map the original image
 * onto the same place the region describes. A 90 degree turn swaps the two
 * axes, which is why the scale factors swap over too.
 */
function orientationTransform(
  rotate: number,
  region: Rect,
  destX: number,
  destY: number,
  scaleX: number,
  scaleY: number,
  sourceWidth: number,
  sourceHeight: number,
): { tx: number; ty: number; angle: number; scaleX: number; scaleY: number } {
  switch (rotate) {
    case 90:
      return {
        tx: destX + scaleX * (sourceHeight - region.x),
        ty: destY - scaleY * region.y,
        angle: Math.PI / 2,
        scaleX: scaleY,
        scaleY: scaleX,
      };
    case 180:
      return {
        tx: destX + scaleX * (sourceWidth - region.x),
        ty: destY + scaleY * (sourceHeight - region.y),
        angle: Math.PI,
        scaleX,
        scaleY,
      };
    case 270:
      return {
        tx: destX - scaleX * region.x,
        ty: destY + scaleY * (sourceWidth - region.y),
        angle: -Math.PI / 2,
        scaleX: scaleY,
        scaleY: scaleX,
      };
    default:
      return {
        tx: destX - scaleX * region.x,
        ty: destY - scaleY * region.y,
        angle: 0,
        scaleX,
        scaleY,
      };
  }
}

/**
 * Draws a photo into a card-shaped destination.
 *
 * The on-screen preview and the PDF export both call this, so what the
 * operator sees is exactly what gets printed - same crop, same fit, same
 * mirror.
 */
export function drawImageInto(
  ctx: CanvasRenderingContext2D,
  source: DrawableSource,
  destinationWidth: number,
  destinationHeight: number,
  fit: FitMode,
  transform: DrawTransform,
  crop?: CropRect,
): void {
  const sourceWidth = source.width;
  const sourceHeight = source.height;

  const oriented = cropInOrientedSpace(
    crop ?? { x: 0, y: 0, width: sourceWidth, height: sourceHeight },
    sourceWidth,
    sourceHeight,
    transform.rotate,
  );

  const { region, destX, destY, destWidth, destHeight } = selectRegion(
    oriented,
    destinationWidth,
    destinationHeight,
    fit,
  );

  const scaleX = destWidth / region.width;
  const scaleY = destHeight / region.height;

  ctx.save();

  // The white card behind everything.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, destinationWidth, destinationHeight);

  // Only the part of the image that belongs on the card is drawn; the rest of
  // the photo is clipped away.
  ctx.beginPath();
  ctx.rect(destX, destY, destWidth, destHeight);
  ctx.clip();

  ctx.save();
  if (transform.mirror) {
    // Flip the finished card by mirroring the canvas around its centre.
    ctx.translate(destinationWidth, 0);
    ctx.scale(-1, 1);
  }

  const placement = orientationTransform(
    transform.rotate,
    region,
    destX,
    destY,
    scaleX,
    scaleY,
    sourceWidth,
    sourceHeight,
  );
  ctx.translate(placement.tx, placement.ty);
  if (placement.angle !== 0) ctx.rotate(placement.angle);
  ctx.scale(placement.scaleX, placement.scaleY);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0);
  ctx.restore();

  ctx.restore();
}

/**
 * True when the photo is the wrong way round for the card - a portrait photo
 * of a landscape card almost always means the phone was held upright.
 */
export function shouldAutoRotate(
  sourceWidth: number,
  sourceHeight: number,
  cardWidthMm: number,
  cardHeightMm: number,
): boolean {
  return sourceHeight > sourceWidth && cardWidthMm > cardHeightMm;
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw to a canvas.");
  return { canvas, ctx };
}

/**
 * Renders a card face at the exact pixel size its physical size demands, so
 * the embedded image really is the requested DPI rather than the photo's
 * native resolution.
 */
export async function rasterizeCard(
  source: DrawableSource,
  cardWidthMm: number,
  cardHeightMm: number,
  dpi: number,
  fit: FitMode,
  transform: DrawTransform,
  losslessPng: boolean,
): Promise<{ bytes: Uint8Array; isPng: boolean; pixelWidth: number; pixelHeight: number }> {
  const pixelWidth = Math.max(1, Math.round((cardWidthMm / 25.4) * dpi));
  const pixelHeight = Math.max(1, Math.round((cardHeightMm / 25.4) * dpi));
  const { canvas, ctx } = createCanvas(pixelWidth, pixelHeight);

  drawImageInto(ctx, source, pixelWidth, pixelHeight, fit, transform);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, losslessPng ? "image/png" : "image/jpeg", losslessPng ? undefined : 0.92);
  });
  if (!blob) throw new Error("Could not encode the card image.");

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    isPng: losslessPng,
    pixelWidth,
    pixelHeight,
  };
}
