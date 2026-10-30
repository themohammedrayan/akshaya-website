"use client";

import { useEffect, useRef, useState } from "react";
import { drawImageInto } from "@/lib/pvc-cards/raster";
import type { FitMode } from "@/lib/pvc-cards/types";
import type { DrawTransform, LoadedImage } from "./types";

type Props = {
  label: string;
  image: LoadedImage | null;
  transform: DrawTransform;
  fitMode: FitMode;
  chooseLabel: string;
  cameraLabel: string;
  dropLabel: string;
  clearLabel: string;
  rotateLabel: string;
  mirrorLabel: string;
  onFiles: (files: FileList | null) => void;
  onClear: () => void;
  onRotate: () => void;
  onMirror: () => void;
};

/**
 * One side of the card: a photo of the front or the back, with the controls
 * needed to fix a photo that was taken the wrong way round.
 */
export function ImageSlot({
  label,
  image,
  transform,
  fitMode,
  chooseLabel,
  cameraLabel,
  dropLabel,
  clearLabel,
  rotateLabel,
  mirrorLabel,
  onFiles,
  onClear,
  onRotate,
  onMirror,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawImageInto(ctx, image.bitmap, canvas.width, canvas.height, fitMode, transform);
  }, [image, transform, fitMode]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-zinc-800">{label}</span>
        {image && (
          <button type="button" onClick={onClear} className="text-sm font-medium text-red-600 hover:underline">
            {clearLabel}
          </button>
        )}
      </div>

      {image ? (
        <div className="mt-2">
          <canvas
            ref={canvasRef}
            width={360}
            height={220}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 object-contain"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRotate}
              className="min-h-11 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {rotateLabel}
            </button>
            <button
              type="button"
              onClick={onMirror}
              className={image.mirror
                ? "min-h-11 rounded-xl bg-brand-700 text-sm font-semibold text-white"
                : "min-h-11 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"}
            >
              {mirrorLabel}
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            onFiles(event.dataTransfer.files);
          }}
          className={`mt-2 rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
            dragging ? "border-brand-500 bg-brand-50" : "border-zinc-300 bg-zinc-50"
          }`}
        >
          <p className="text-xs text-zinc-500">{dropLabel}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-11 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800"
            >
              {chooseLabel}
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="min-h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {cameraLabel}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              onFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              onFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
