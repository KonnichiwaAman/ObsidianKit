import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileText,
  Info,
  Loader2,
  Minimize,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFRawStream,
  PDFRef,
  PDFStream,
  decodePDFRawStream,
} from "pdf-lib";

type CompressionMode = "light" | "recommended" | "strong";
type CompressionApproach = "quality-first" | "target-size";
type SizeUnit = "KB" | "MB";

interface CompressionModeConfig {
  id: CompressionMode;
  label: string;
  subtitle: string;
  description: string;
  maxDownsample: number;
  jpegQuality: number;
}

interface ImageStreamEntry {
  ref: PDFRef;
  stream: PDFRawStream;
  width: number;
  height: number;
}

interface CompressionResult {
  blob: Blob;
  mode: CompressionMode;
  requestedMode: CompressionMode;
  approach: CompressionApproach;
  imageTotal: number;
  imageOptimized: number;
  duplicateObjectsRemoved: number;
  unusedObjectsRemoved: number;
  durationMs: number;
  usedOriginalFallback: boolean;
  qualityStrategy: string;
  evaluatedProfiles: string[];
  targetSizeBytes?: number;
  metTargetSize?: boolean;
  note?: string;
}

interface CompressionCandidate {
  scale: number;
  quality: number;
}

interface ObjectCompressionResult {
  blob: Blob;
  imageTotal: number;
  imageOptimized: number;
  duplicateObjectsRemoved: number;
  unusedObjectsRemoved: number;
}

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

interface CompressionProgress {
  current: number;
  total: number;
  label: string;
}

const MAX_LARGE_FILE_WARNING_MB = 50;
const MAX_FILE_SIZE_MB = 200;

const MODE_CONFIGS: CompressionModeConfig[] = [
  {
    id: "light",
    label: "Light",
    subtitle: "Less",
    description: "Highest quality. Structural cleanup only.",
    maxDownsample: 0,
    jpegQuality: 1,
  },
  {
    id: "recommended",
    label: "Recommended",
    subtitle: "Default",
    description: "Best balance of quality and size.",
    maxDownsample: 0.2,
    jpegQuality: 0.91,
  },
  {
    id: "strong",
    label: "Strong",
    subtitle: "Extreme",
    description: "Maximum compression with slight quality loss on photos.",
    maxDownsample: 0.45,
    jpegQuality: 0.78,
  },
];

const RAW_PIXEL_FILTERS = new Set([
  "FlateDecode",
  "LZWDecode",
  "ASCII85Decode",
  "ASCIIHexDecode",
  "RunLengthDecode",
]);

let pdfJsModulePromise: Promise<PdfJsModule> | null = null;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function toBytes(value: number, unit: SizeUnit): number {
  if (unit === "KB") return Math.round(value * 1024);
  return Math.round(value * 1024 * 1024);
}

function padBlobToExactSize(blob: Blob, targetBytes: number, mimeType: string): Blob {
  if (blob.size >= targetBytes) return blob;
  const padding = new Uint8Array(targetBytes - blob.size);
  return new Blob([blob, padding], { type: mimeType });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(1, Math.round(ms))} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function savedPercent(original: number, next: number): number {
  if (original <= 0) return 0;
  return Math.max(0, ((original - next) / original) * 100);
}

function refEquals(a: PDFRef, b: PDFRef): boolean {
  return a.objectNumber === b.objectNumber && a.generationNumber === b.generationNumber;
}

function pdfNameValue(name: PDFName | undefined): string | null {
  if (!name) return null;
  const value = name.asString();
  return value.startsWith("/") ? value.slice(1) : value;
}

function getFilterNames(dict: PDFDict): string[] {
  const filter = dict.lookup(PDFName.of("Filter"));
  if (filter instanceof PDFName) {
    const value = pdfNameValue(filter);
    return value ? [value] : [];
  }

  if (filter instanceof PDFArray) {
    const names: string[] = [];
    for (let index = 0; index < filter.size(); index += 1) {
      const maybeName = filter.lookupMaybe(index, PDFName);
      const value = maybeName ? pdfNameValue(maybeName) : null;
      if (value) names.push(value);
    }
    return names;
  }

  return [];
}

function lookupNumber(dict: PDFDict, key: string): number | null {
  const value = dict.lookupMaybe(PDFName.of(key), PDFNumber);
  return value ? value.asNumber() : null;
}

function isImageXObject(dict: PDFDict): boolean {
  const subtype = dict.lookupMaybe(PDFName.of("Subtype"), PDFName);
  if (pdfNameValue(subtype) !== "Image") return false;

  const type = dict.lookupMaybe(PDFName.of("Type"), PDFName);
  if (!type) return true;
  return pdfNameValue(type) === "XObject";
}

function stripMetadata(pdfDoc: PDFDocument): void {
  pdfDoc.setTitle("");
  pdfDoc.setAuthor("");
  pdfDoc.setSubject("");
  pdfDoc.setKeywords([]);
  pdfDoc.setCreator("");
  pdfDoc.setProducer("");
  pdfDoc.setCreationDate(new Date(0));
  pdfDoc.setModificationDate(new Date(0));
  pdfDoc.context.trailerInfo.Info = undefined;
}

function collectImageStreams(pdfDoc: PDFDocument): ImageStreamEntry[] {
  const entries: ImageStreamEntry[] = [];

  for (const [ref, object] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    if (!isImageXObject(object.dict)) continue;

    const imageMask = object.dict.lookupMaybe(PDFName.of("ImageMask"), PDFBool);
    if (imageMask?.asBoolean()) continue;

    const width = lookupNumber(object.dict, "Width") ?? 0;
    const height = lookupNumber(object.dict, "Height") ?? 0;
    if (width <= 0 || height <= 0) continue;

    entries.push({ ref, stream: object, width, height });
  }

  return entries;
}

function replaceRefInObject(object: PDFObject | undefined, fromRef: PDFRef, toRef: PDFRef): void {
  if (!object) return;

  if (object instanceof PDFDict) {
    for (const [key, value] of object.entries()) {
      if (value instanceof PDFRef && refEquals(value, fromRef)) {
        object.set(key, toRef);
        continue;
      }
      replaceRefInObject(value, fromRef, toRef);
    }
    return;
  }

  if (object instanceof PDFArray) {
    for (let index = 0; index < object.size(); index += 1) {
      const value = object.get(index);
      if (value instanceof PDFRef && refEquals(value, fromRef)) {
        object.set(index, toRef);
        continue;
      }
      replaceRefInObject(value, fromRef, toRef);
    }
    return;
  }

  if (object instanceof PDFStream) {
    replaceRefInObject(object.dict, fromRef, toRef);
  }
}

function replaceRefEverywhere(pdfDoc: PDFDocument, fromRef: PDFRef, toRef: PDFRef): void {
  for (const [, object] of pdfDoc.context.enumerateIndirectObjects()) {
    replaceRefInObject(object, fromRef, toRef);
  }

  const trailer = pdfDoc.context.trailerInfo;

  if (trailer.Root instanceof PDFRef && refEquals(trailer.Root, fromRef)) {
    trailer.Root = toRef;
  } else {
    replaceRefInObject(trailer.Root, fromRef, toRef);
  }

  if (trailer.Encrypt instanceof PDFRef && refEquals(trailer.Encrypt, fromRef)) {
    trailer.Encrypt = toRef;
  } else {
    replaceRefInObject(trailer.Encrypt, fromRef, toRef);
  }

  if (trailer.Info instanceof PDFRef && refEquals(trailer.Info, fromRef)) {
    trailer.Info = toRef;
  } else {
    replaceRefInObject(trailer.Info, fromRef, toRef);
  }

  replaceRefInObject(trailer.ID, fromRef, toRef);
}

function collectReferencedRefs(object: PDFObject | undefined, refs: PDFRef[], seen: Set<PDFObject>): void {
  if (!object) return;
  if (seen.has(object)) return;
  seen.add(object);

  if (object instanceof PDFRef) {
    refs.push(object);
    return;
  }

  if (object instanceof PDFDict) {
    for (const [, value] of object.entries()) {
      collectReferencedRefs(value, refs, seen);
    }
    return;
  }

  if (object instanceof PDFArray) {
    for (let index = 0; index < object.size(); index += 1) {
      collectReferencedRefs(object.get(index), refs, seen);
    }
    return;
  }

  if (object instanceof PDFStream) {
    collectReferencedRefs(object.dict, refs, seen);
  }
}

function pruneUnusedObjects(pdfDoc: PDFDocument): number {
  const reachableRefTags = new Set<string>();
  const queue: PDFRef[] = [];
  const seenObjects = new Set<PDFObject>();
  const trailer = pdfDoc.context.trailerInfo;

  collectReferencedRefs(trailer.Root, queue, seenObjects);
  collectReferencedRefs(trailer.Encrypt, queue, seenObjects);
  collectReferencedRefs(trailer.Info, queue, seenObjects);
  collectReferencedRefs(trailer.ID, queue, seenObjects);

  while (queue.length > 0) {
    const ref = queue.pop();
    if (!ref) continue;
    if (reachableRefTags.has(ref.tag)) continue;

    reachableRefTags.add(ref.tag);
    const object = pdfDoc.context.lookup(ref);
    collectReferencedRefs(object, queue, seenObjects);
  }

  let removedCount = 0;
  for (const [ref] of pdfDoc.context.enumerateIndirectObjects()) {
    if (reachableRefTags.has(ref.tag)) continue;
    pdfDoc.context.delete(ref);
    removedCount += 1;
  }

  return removedCount;
}

function bytesToHex(bytes: Uint8Array): string {
  let result = "";
  for (const value of bytes) {
    result += value.toString(16).padStart(2, "0");
  }
  return result;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(bytes.length);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

async function hashBytes(bytes: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", toArrayBuffer(bytes));
    return bytesToHex(new Uint8Array(digest));
  }

  let hash = 2166136261;
  for (const value of bytes) {
    hash ^= value;
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}

async function buildImageSignature(stream: PDFRawStream): Promise<string> {
  const dict = stream.dict;
  const width = lookupNumber(dict, "Width") ?? 0;
  const height = lookupNumber(dict, "Height") ?? 0;
  const bits = lookupNumber(dict, "BitsPerComponent") ?? 8;
  const filter = getFilterNames(dict).join("|") || "none";
  const colorSpace = dict.lookupMaybe(PDFName.of("ColorSpace"), PDFName);
  const colorSpaceName = colorSpace ? pdfNameValue(colorSpace) : "unknown";
  const smask = dict.lookupMaybe(PDFName.of("SMask"), PDFRef);
  const smaskTag = smask ? smask.tag : "none";
  const contentHash = await hashBytes(stream.asUint8Array());

  return `${width}x${height}:${bits}:${filter}:${colorSpaceName}:${smaskTag}:${contentHash}`;
}

async function dedupeDuplicateImageObjects(pdfDoc: PDFDocument): Promise<number> {
  const signatures = new Map<string, PDFRef>();
  let duplicatesRemoved = 0;

  for (const [ref, object] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    if (!isImageXObject(object.dict)) continue;

    const signature = await buildImageSignature(object);
    const canonicalRef = signatures.get(signature);

    if (!canonicalRef) {
      signatures.set(signature, ref);
      continue;
    }

    replaceRefEverywhere(pdfDoc, ref, canonicalRef);
    pdfDoc.context.delete(ref);
    duplicatesRemoved += 1;
  }

  return duplicatesRemoved;
}

async function decodeEncodedImage(bytes: Uint8Array, mimeType: string): Promise<HTMLCanvasElement | null> {
  const blob = new Blob([toArrayBuffer(bytes)], { type: mimeType });

  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        return null;
      }
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      return canvas;
    } catch {
      // Fall through to Image element decoding.
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!context) {
        resolve(null);
        return;
      }
      context.drawImage(image, 0, 0);
      resolve(canvas);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

function resolveRawColorSpaceName(dict: PDFDict): string | null {
  const colorSpace = dict.lookup(PDFName.of("ColorSpace"));
  if (colorSpace instanceof PDFName) return pdfNameValue(colorSpace);

  if (colorSpace instanceof PDFArray) {
    const first = colorSpace.lookupMaybe(0, PDFName);
    return first ? pdfNameValue(first) : null;
  }

  return null;
}

function decodeMaskAlpha(pdfDoc: PDFDocument, smaskRef: PDFRef, width: number, height: number): Uint8Array | null {
  const maybeStream = pdfDoc.context.lookupMaybe(smaskRef, PDFStream);
  if (!(maybeStream instanceof PDFRawStream)) return null;
  const stream = maybeStream;

  const bits = lookupNumber(stream.dict, "BitsPerComponent") ?? 8;
  if (bits !== 8) return null;

  try {
    const decoded = decodePDFRawStream(stream).decode();
    const requiredLength = width * height;
    if (decoded.length < requiredLength) return null;
    return decoded.slice(0, requiredLength);
  } catch {
    return null;
  }
}

function decodeRawPixelImage(pdfDoc: PDFDocument, stream: PDFRawStream): HTMLCanvasElement | null {
  const dict = stream.dict;
  const width = lookupNumber(dict, "Width") ?? 0;
  const height = lookupNumber(dict, "Height") ?? 0;
  if (width <= 0 || height <= 0) return null;

  const bits = lookupNumber(dict, "BitsPerComponent") ?? 8;
  if (bits !== 8) return null;

  const colorSpaceName = resolveRawColorSpaceName(dict);
  if (!colorSpaceName) return null;

  let channels = 0;
  if (colorSpaceName === "DeviceGray") channels = 1;
  if (colorSpaceName === "DeviceRGB") channels = 3;
  if (colorSpaceName === "DeviceCMYK") channels = 4;
  if (channels === 0) return null;

  let decoded: Uint8Array;
  try {
    decoded = decodePDFRawStream(stream).decode();
  } catch {
    return null;
  }

  const pixelCount = width * height;
  const expectedLength = pixelCount * channels;
  if (decoded.length < expectedLength) return null;

  const alphaRef = dict.lookupMaybe(PDFName.of("SMask"), PDFRef);
  const alpha = alphaRef ? decodeMaskAlpha(pdfDoc, alphaRef, width, height) : null;

  const rgba = new Uint8ClampedArray(pixelCount * 4);
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const sourceIndex = pixelIndex * channels;
    const targetIndex = pixelIndex * 4;

    let r = 0;
    let g = 0;
    let b = 0;

    if (channels === 1) {
      const gray = decoded[sourceIndex];
      r = gray;
      g = gray;
      b = gray;
    } else if (channels === 3) {
      r = decoded[sourceIndex];
      g = decoded[sourceIndex + 1];
      b = decoded[sourceIndex + 2];
    } else {
      const c = decoded[sourceIndex] / 255;
      const m = decoded[sourceIndex + 1] / 255;
      const y = decoded[sourceIndex + 2] / 255;
      const k = decoded[sourceIndex + 3] / 255;
      r = Math.round(255 * (1 - c) * (1 - k));
      g = Math.round(255 * (1 - m) * (1 - k));
      b = Math.round(255 * (1 - y) * (1 - k));
    }

    rgba[targetIndex] = r;
    rgba[targetIndex + 1] = g;
    rgba[targetIndex + 2] = b;
    rgba[targetIndex + 3] = alpha ? alpha[pixelIndex] : 255;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas;
}

function determineDownsampleScale(width: number, height: number, mode: CompressionMode): number {
  if (mode === "light") return 1;

  const longestEdge = Math.max(width, height);

  if (mode === "recommended") {
    if (longestEdge <= 1200) return 0.9;
    if (longestEdge <= 2400) return 0.85;
    return 0.8;
  }

  if (longestEdge <= 1200) return 0.7;
  if (longestEdge <= 2400) return 0.62;
  return 0.55;
}

function getModeConfig(mode: CompressionMode): CompressionModeConfig {
  return MODE_CONFIGS.find((config) => config.id === mode) ?? MODE_CONFIGS[1];
}

function shouldAttemptRasterFallback(
  mode: CompressionMode,
  originalSize: number,
  objectResult: ObjectCompressionResult,
): boolean {
  if (mode === "light") return false;
  if (objectResult.blob.size >= originalSize) return true;
  if (objectResult.imageTotal === 0) return true;

  const reduction = savedPercent(originalSize, objectResult.blob.size);
  const optimizedRatio = objectResult.imageTotal > 0
    ? objectResult.imageOptimized / objectResult.imageTotal
    : 0;

  if (mode === "recommended") {
    return reduction < 15 || optimizedRatio < 0.3;
  }

  return reduction < 28 || optimizedRatio < 0.45;
}

function getRasterQuality(mode: CompressionMode): number {
  if (mode === "recommended") return 0.86;
  if (mode === "strong") return 0.72;
  return 0.94;
}

function getRasterDpi(mode: CompressionMode, pageCount: number, originalSizeBytes: number): number {
  const sizeMb = originalSizeBytes / (1024 * 1024);

  let baseDpi = mode === "recommended" ? 165 : 130;

  if (pageCount > 120) baseDpi -= 25;
  else if (pageCount > 60) baseDpi -= 15;
  else if (pageCount > 20) baseDpi -= 8;

  if (sizeMb > 100) baseDpi -= 15;
  else if (sizeMb > 50) baseDpi -= 8;

  if (mode === "recommended") {
    return Math.max(130, Math.min(185, baseDpi));
  }

  return Math.max(105, Math.min(150, baseDpi));
}

function fitDimensionsToArea(width: number, height: number, maxArea: number): { width: number; height: number } {
  const currentArea = width * height;
  if (currentArea <= maxArea) {
    return { width, height };
  }

  const scale = Math.sqrt(maxArea / currentArea);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

function buildCompressionCandidates(
  mode: CompressionMode,
  width: number,
  height: number,
  modeConfig: CompressionModeConfig,
): CompressionCandidate[] {
  if (mode === "light") return [];

  const baseScale = determineDownsampleScale(width, height, mode);
  const minScale = 1 - modeConfig.maxDownsample;

  if (mode === "recommended") {
    return [
      { scale: Math.max(minScale, baseScale), quality: modeConfig.jpegQuality },
      { scale: Math.max(minScale, baseScale - 0.04), quality: 0.9 },
      { scale: Math.max(minScale, baseScale - 0.07), quality: 0.88 },
    ];
  }

  return [
    { scale: Math.max(minScale, baseScale), quality: modeConfig.jpegQuality },
    { scale: Math.max(minScale, baseScale - 0.08), quality: 0.74 },
    { scale: Math.max(minScale, baseScale - 0.12), quality: 0.7 },
    { scale: Math.max(minScale, baseScale - 0.16), quality: 0.66 },
  ];
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function decodeImageEntry(pdfDoc: PDFDocument, entry: ImageStreamEntry): Promise<HTMLCanvasElement | null> {
  const filterNames = getFilterNames(entry.stream.dict);

  if (filterNames.length === 1 && filterNames[0] === "DCTDecode") {
    return decodeEncodedImage(entry.stream.asUint8Array(), "image/jpeg");
  }

  if (filterNames.length === 1 && filterNames[0] === "JPXDecode") {
    return decodeEncodedImage(entry.stream.asUint8Array(), "image/jp2");
  }

  if (filterNames.length === 0 || filterNames.every((name) => RAW_PIXEL_FILTERS.has(name))) {
    return decodeRawPixelImage(pdfDoc, entry.stream);
  }

  return null;
}

async function optimizeImageEntry(
  pdfDoc: PDFDocument,
  entry: ImageStreamEntry,
  mode: CompressionMode,
  workCanvas: HTMLCanvasElement,
): Promise<boolean> {
  if (mode === "light") return false;

  try {
    const sourceCanvas = await decodeImageEntry(pdfDoc, entry);
    if (!sourceCanvas) return false;

    const modeConfig = getModeConfig(mode);

    const originalBytesLength = entry.stream.asUint8Array().length;
    const minGainRatio = mode === "recommended" ? 0.98 : 0.995;

    const candidates = buildCompressionCandidates(mode, sourceCanvas.width, sourceCanvas.height, modeConfig);

    let bestBytes: Uint8Array | null = null;
    let bestSize = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const targetWidth = Math.max(1, Math.round(sourceCanvas.width * candidate.scale));
      const targetHeight = Math.max(1, Math.round(sourceCanvas.height * candidate.scale));

      workCanvas.width = targetWidth;
      workCanvas.height = targetHeight;

      const context = workCanvas.getContext("2d", { alpha: false });
      if (!context) continue;

      // Fill with white to avoid transparent regions turning black after JPEG encoding.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, targetWidth, targetHeight);
      context.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

      const blob = await canvasToBlob(workCanvas, candidate.quality);
      if (!blob) continue;

      const jpgBytes = new Uint8Array(await blob.arrayBuffer());
      if (jpgBytes.length === 0) continue;

      if (jpgBytes.length < bestSize) {
        bestBytes = jpgBytes;
        bestSize = jpgBytes.length;
      }
    }

    if (!bestBytes) return false;
    if (bestSize >= originalBytesLength * minGainRatio) return false;

    const embeddedImage = await pdfDoc.embedJpg(bestBytes);
    await embeddedImage.embed();

    const maybeReplacement = pdfDoc.context.lookupMaybe(embeddedImage.ref, PDFStream);
    if (!(maybeReplacement instanceof PDFRawStream)) return false;
    const replacementStream = maybeReplacement;

    pdfDoc.context.assign(entry.ref, replacementStream);
    pdfDoc.context.delete(embeddedImage.ref);

    return true;
  } catch {
    // If any individual image fails, skip it and continue with the rest.
    return false;
  }
}

async function loadPdfJsModule(): Promise<PdfJsModule> {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
      }
      return pdfjs;
    });
  }

  return pdfJsModulePromise;
}

async function compressWithObjectStrategy(
  inputBytes: Uint8Array,
  mode: CompressionMode,
  workCanvas: HTMLCanvasElement,
  updateProgress: (progress: CompressionProgress) => void,
): Promise<ObjectCompressionResult> {
  const pdfDoc = await PDFDocument.load(inputBytes);
  stripMetadata(pdfDoc);

  const imageEntries = collectImageStreams(pdfDoc);
  let imageOptimized = 0;

  if (mode !== "light") {
    if (imageEntries.length > 0) {
      for (let index = 0; index < imageEntries.length; index += 1) {
        const optimized = await optimizeImageEntry(pdfDoc, imageEntries[index], mode, workCanvas);
        if (optimized) imageOptimized += 1;

        const current = index + 1;
        updateProgress({
          current,
          total: imageEntries.length,
          label: `Processing embedded images... ${current}/${imageEntries.length}`,
        });
        await waitForPaint();
      }
    } else {
      updateProgress({
        current: 0,
        total: 0,
        label: "No embedded images found. Running structural optimization...",
      });
      await waitForPaint();
    }
  } else {
    updateProgress({ current: 0, total: 0, label: "Light mode. Running structural optimization..." });
    await waitForPaint();
  }

  updateProgress({ current: 0, total: 0, label: "Removing duplicate objects..." });
  let duplicateObjectsRemoved = 0;
  try {
    duplicateObjectsRemoved = await dedupeDuplicateImageObjects(pdfDoc);
  } catch {
    duplicateObjectsRemoved = 0;
  }
  await waitForPaint();

  updateProgress({ current: 0, total: 0, label: "Pruning unused objects..." });
  let unusedObjectsRemoved = 0;
  try {
    unusedObjectsRemoved = pruneUnusedObjects(pdfDoc);
  } catch {
    unusedObjectsRemoved = 0;
  }
  await waitForPaint();

  updateProgress({ current: 0, total: 0, label: "Saving object-optimized PDF..." });
  const optimizedBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });

  return {
    blob: new Blob([toArrayBuffer(optimizedBytes)], { type: "application/pdf" }),
    imageTotal: imageEntries.length,
    imageOptimized,
    duplicateObjectsRemoved,
    unusedObjectsRemoved,
  };
}

async function compressWithRasterStrategy(
  inputBytes: Uint8Array,
  mode: CompressionMode,
  workCanvas: HTMLCanvasElement,
  updateProgress: (progress: CompressionProgress) => void,
): Promise<Blob> {
  const pdfjs = await loadPdfJsModule();

  updateProgress({ current: 0, total: 0, label: "Starting advanced page-raster compression..." });
  await waitForPaint();

  const loadingTask = pdfjs.getDocument({ data: toArrayBuffer(inputBytes) });
  const sourceDocument = await loadingTask.promise;

  try {
    const outputDoc = await PDFDocument.create();
    const pageCount = sourceDocument.numPages;
    const renderScaleBase = getRasterDpi(mode, pageCount, inputBytes.length) / 72;
    const jpegQuality = getRasterQuality(mode);
    const maxRenderArea = mode === "recommended" ? 8_000_000 : 5_500_000;

    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
      const page = await sourceDocument.getPage(pageIndex);

      const sourceViewport = page.getViewport({ scale: 1 });
      const trialViewport = page.getViewport({ scale: renderScaleBase });
      const fitted = fitDimensionsToArea(trialViewport.width, trialViewport.height, maxRenderArea);
      const renderScale = Math.max(0.2, fitted.width / Math.max(1, sourceViewport.width));
      const renderViewport = page.getViewport({ scale: renderScale });

      workCanvas.width = Math.max(1, Math.floor(renderViewport.width));
      workCanvas.height = Math.max(1, Math.floor(renderViewport.height));

      const context = workCanvas.getContext("2d", { alpha: false });
      if (!context) {
        throw new Error("Canvas context unavailable for raster compression.");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, workCanvas.width, workCanvas.height);

      const renderTask = page.render({
        canvas: workCanvas,
        canvasContext: context,
        viewport: renderViewport,
        background: "rgb(255,255,255)",
      });
      await renderTask.promise;

      const jpgBlob = await canvasToBlob(workCanvas, jpegQuality);
      if (!jpgBlob) {
        throw new Error("Failed to encode rendered page as JPEG.");
      }

      const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
      const image = await outputDoc.embedJpg(jpgBytes);

      const outputPage = outputDoc.addPage([sourceViewport.width, sourceViewport.height]);
      outputPage.drawImage(image, {
        x: 0,
        y: 0,
        width: sourceViewport.width,
        height: sourceViewport.height,
      });

      page.cleanup();

      updateProgress({
        current: pageIndex,
        total: pageCount,
        label: `Advanced raster compression... ${pageIndex}/${pageCount}`,
      });
      await waitForPaint();
    }

    stripMetadata(outputDoc);

    const outputBytes = await outputDoc.save({ useObjectStreams: true, addDefaultPage: false });
    return new Blob([toArrayBuffer(outputBytes)], { type: "application/pdf" });
  } finally {
    await sourceDocument.destroy();
  }
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function buildFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.trim()) {
      const lower = error.message.toLowerCase();
      if (lower.includes("exact target") || lower.includes("target-size") || lower.includes("not achievable")) {
        return error.message;
      }
    }

    const message = error.message.toLowerCase();
    if (message.includes("encrypted") || message.includes("password")) {
      return "This PDF is password-protected. Please unlock it first, then try compression again.";
    }
    if (message.includes("invalid") || message.includes("corrupt")) {
      return "This PDF appears unsupported or corrupted. Please try another file.";
    }
  }

  return "Compression failed in the browser for this document. Try Light mode or use a smaller PDF.";
}

export default function PdfCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<CompressionMode>("recommended");
  const [approach, setApproach] = useState<CompressionApproach>("quality-first");
  const [targetSizeValue, setTargetSizeValue] = useState("8");
  const [targetSizeUnit, setTargetSizeUnit] = useState<SizeUnit>("MB");
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [dropActive, setDropActive] = useState(false);
  const [progress, setProgress] = useState<CompressionProgress>({
    current: 0,
    total: 0,
    label: "",
  });
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const workCanvasRef = useRef<HTMLCanvasElement>(null);

  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [compressedPreviewUrl, setCompressedPreviewUrl] = useState<string | null>(null);

  const currentModeConfig = useMemo(() => getModeConfig(mode), [mode]);

  const largeFileWarning = useMemo(() => {
    if (!file) return false;
    return file.size > MAX_LARGE_FILE_WARNING_MB * 1024 * 1024;
  }, [file]);

  function parseTargetSizeBytes(): number {
    const parsed = Number.parseFloat(targetSizeValue);
    const normalized = targetSizeUnit === "KB"
      ? Math.min(Math.max(parsed || 2048, 50), 1024 * 1024)
      : Math.min(Math.max(parsed || 8, 0.1), 1024);

    return toBytes(normalized, targetSizeUnit);
  }

  useEffect(() => {
    if (!file) {
      setOriginalPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setOriginalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!compressedBlob) {
      setCompressedPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(compressedBlob);
    setCompressedPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [compressedBlob]);

  function resetAll() {
    setFile(null);
    setErrorMessage(null);
    setResult(null);
    setCompressedBlob(null);
    setProgress({ current: 0, total: 0, label: "" });
    if (inputRef.current) inputRef.current.value = "";
  }

  function applyUploadedFile(candidate: File | null | undefined) {
    if (!candidate) return;

    const isPdf = candidate.type === "application/pdf" || candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setErrorMessage("Please upload a valid PDF file.");
      return;
    }

    if (candidate.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`This file is too large for browser processing. Maximum supported size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setErrorMessage(null);
    setFile(candidate);
    setResult(null);
    setCompressedBlob(null);
    setProgress({ current: 0, total: 0, label: "" });
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    applyUploadedFile(event.target.files?.[0]);
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDropActive(false);
    applyUploadedFile(event.dataTransfer.files?.[0]);
  }

  function onDrag(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDropActive(true);
    } else {
      setDropActive(false);
    }
  }

  function onModeChange(nextMode: CompressionMode) {
    if (processing) return;
    setMode(nextMode);
    setResult(null);
    setCompressedBlob(null);
    setProgress({ current: 0, total: 0, label: "" });
  }

  async function runCompressionAttempt(
    originalPdfBytes: Uint8Array,
    originalPdfBlob: Blob,
    modeCandidate: CompressionMode,
    workCanvas: HTMLCanvasElement,
  ): Promise<{
    modeUsed: CompressionMode;
    blob: Blob;
    imageTotal: number;
    imageOptimized: number;
    duplicateObjectsRemoved: number;
    unusedObjectsRemoved: number;
    usedOriginalFallback: boolean;
    notes: string[];
  }> {
    let objectResult: ObjectCompressionResult | null = null;
    let objectPipelineError: unknown = null;

    try {
      objectResult = await compressWithObjectStrategy(
        originalPdfBytes,
        modeCandidate,
        workCanvas,
        setProgress,
      );
    } catch (error) {
      objectPipelineError = error;
    }

    let selectedBlob = objectResult?.blob ?? originalPdfBlob;
    let selectedEngine: "object" | "raster" | "structural" | "original" = objectResult ? "object" : "original";
    let usedOriginalFallback = false;

    const notes: string[] = [];
    if (objectResult) {
      notes.push("Applied object-aware optimization on embedded images and PDF structure.");
    }

    if (modeCandidate !== "light") {
      const shouldTryRaster = objectResult
        ? shouldAttemptRasterFallback(modeCandidate, originalPdfBlob.size, objectResult)
        : true;

      if (shouldTryRaster) {
        try {
          const rasterBlob = await compressWithRasterStrategy(
            originalPdfBytes,
            modeCandidate,
            workCanvas,
            setProgress,
          );

          if (rasterBlob.size < selectedBlob.size) {
            selectedBlob = rasterBlob;
            selectedEngine = "raster";
            notes.push("Advanced page-raster pipeline produced a smaller result.");
          } else {
            notes.push("Advanced page-raster pipeline was tested but not selected because another result was smaller.");
          }
        } catch {
          notes.push("Advanced page-raster pipeline could not be applied to this PDF. Using fallback result.");
        }
      }
    }

    if (!objectResult) {
      try {
        setProgress({ current: 0, total: 0, label: "Trying structural-only fallback..." });
        await waitForPaint();

        const structuralDoc = await PDFDocument.load(originalPdfBytes);
        stripMetadata(structuralDoc);
        const structuralBytes = await structuralDoc.save({ useObjectStreams: true, addDefaultPage: false });
        const structuralBlob = new Blob([toArrayBuffer(structuralBytes)], { type: "application/pdf" });

        if (structuralBlob.size < selectedBlob.size) {
          selectedBlob = structuralBlob;
          selectedEngine = "structural";
          notes.push("Applied structural-only fallback optimization.");
        }
      } catch {
        // Ignore structural fallback failures.
      }
    }

    if (modeCandidate !== "light" && selectedBlob.size >= originalPdfBlob.size) {
      selectedBlob = originalPdfBlob;
      selectedEngine = "original";
      usedOriginalFallback = true;
      notes.push("Returned original file to avoid size inflation.");
    }

    if (modeCandidate === "light" && selectedBlob.size >= originalPdfBlob.size && selectedEngine !== "original") {
      selectedBlob = originalPdfBlob;
      selectedEngine = "original";
    }

    if (!objectResult && selectedEngine === "original" && objectPipelineError) {
      notes.push("Primary object-aware compression failed for this PDF.");
    }

    return {
      modeUsed: modeCandidate,
      blob: selectedBlob,
      imageTotal: objectResult?.imageTotal ?? 0,
      imageOptimized: objectResult?.imageOptimized ?? 0,
      duplicateObjectsRemoved: objectResult?.duplicateObjectsRemoved ?? 0,
      unusedObjectsRemoved: objectResult?.unusedObjectsRemoved ?? 0,
      usedOriginalFallback,
      notes,
    };
  }

  async function handleCompress() {
    if (!file) return;
    if (processing) return;

    setProcessing(true);
    setErrorMessage(null);
    setResult(null);
    setCompressedBlob(null);

    const startedAt = performance.now();

    try {
      const originalPdfBytes = new Uint8Array(await file.arrayBuffer());
      const originalPdfBlob = new Blob([toArrayBuffer(originalPdfBytes)], { type: "application/pdf" });
      const workCanvas = workCanvasRef.current ?? document.createElement("canvas");

      const profiles = mode === "light"
        ? [{ key: "light", label: "Light quality-preserving profile", mode: "light" as const }]
        : mode === "recommended"
          ? [
              { key: "light", label: "Light quality-preserving profile", mode: "light" as const },
              { key: "recommended", label: "Recommended balanced profile", mode: "recommended" as const },
            ]
          : [{ key: "strong", label: "Strong extreme profile", mode: "strong" as const }];

      const attemptErrors: string[] = [];
      const evaluatedProfiles: string[] = [];
      const completedAttempts: Array<{
        key: string;
        label: string;
        mode: CompressionMode;
        attempt: Awaited<ReturnType<typeof runCompressionAttempt>>;
      }> = [];

      for (const profile of profiles) {
        setProgress({ current: 0, total: 0, label: `Trying ${profile.label}...` });
        await waitForPaint();

        try {
          const attempt = await runCompressionAttempt(
            originalPdfBytes,
            originalPdfBlob,
            profile.mode,
            workCanvas,
          );
          completedAttempts.push({ ...profile, attempt });
          evaluatedProfiles.push(profile.label);
        } catch (error) {
          attemptErrors.push(`${profile.label} failed for this file.`);
          console.warn(`Compression attempt failed in ${profile.label}`, error);
        }
      }

      if (completedAttempts.length === 0) {
        throw new Error("Compression could not produce a valid output for this PDF.");
      }

      let selectedProfile = completedAttempts[0];
      let qualityStrategy = "";

      if (mode === "light") {
        qualityStrategy = "Light mode preserves quality and only performs structural optimization.";
      } else if (mode === "recommended") {
        const lightAttempt = completedAttempts.find((entry) => entry.mode === "light");
        const recommendedAttempt = completedAttempts.find((entry) => entry.mode === "recommended");

        if (lightAttempt && recommendedAttempt) {
          const additionalGain = 1 - recommendedAttempt.attempt.blob.size / lightAttempt.attempt.blob.size;
          if (additionalGain >= 0.07) {
            selectedProfile = recommendedAttempt;
            qualityStrategy = "Recommended mode selected because it delivered meaningful additional size reduction.";
          } else {
            selectedProfile = lightAttempt;
            qualityStrategy = "Recommended mode stayed quality-first and kept the lighter profile because additional savings were minor.";
          }
        } else {
          selectedProfile = recommendedAttempt ?? lightAttempt ?? completedAttempts[0];
          qualityStrategy = "Recommended mode used the best available profile for this document.";
        }
      } else {
        selectedProfile = completedAttempts.reduce((smallest, current) => {
          return current.attempt.blob.size < smallest.attempt.blob.size ? current : smallest;
        }, completedAttempts[0]);

        qualityStrategy = "Strong mode prioritizes minimum file size and can run extra extreme passes when helpful.";

        const strongProfile = completedAttempts.find((entry) => entry.mode === "strong");
        if (strongProfile && !strongProfile.attempt.usedOriginalFallback) {
          let iterativeSeedBlob = strongProfile.attempt.blob;
          let iterativeSeedBytes = new Uint8Array(await iterativeSeedBlob.arrayBuffer());

          for (let pass = 1; pass <= 2; pass += 1) {
            setProgress({ current: 0, total: 0, label: `Running strong iterative pass ${pass}/2...` });
            await waitForPaint();

            try {
              const iterativeAttempt = await runCompressionAttempt(
                iterativeSeedBytes,
                iterativeSeedBlob,
                "strong",
                workCanvas,
              );

              const gainedEnough = iterativeAttempt.blob.size < iterativeSeedBlob.size * 0.985;
              if (!gainedEnough) {
                break;
              }

              iterativeSeedBlob = iterativeAttempt.blob;
              iterativeSeedBytes = new Uint8Array(await iterativeSeedBlob.arrayBuffer());
              evaluatedProfiles.push(`Strong iterative pass ${pass}`);

              if (iterativeAttempt.blob.size < selectedProfile.attempt.blob.size) {
                selectedProfile = {
                  key: `strong-iterative-${pass}`,
                  label: `Strong iterative pass ${pass}`,
                  mode: "strong",
                  attempt: iterativeAttempt,
                };
              }
            } catch (error) {
              attemptErrors.push(`Strong iterative pass ${pass} failed.`);
              console.warn(`Strong iterative pass ${pass} failed`, error);
              break;
            }
          }
        }
      }

      const allCandidates = [...completedAttempts];
      if (!allCandidates.some((entry) => entry.key === selectedProfile.key)) {
        allCandidates.push(selectedProfile);
      }

      let targetSizeBytes: number | undefined;
      let metTargetSize: boolean | undefined;
      let finalBlob = selectedProfile.attempt.blob;

      if (approach === "target-size") {
        const requestedTargetBytes = parseTargetSizeBytes();
        targetSizeBytes = requestedTargetBytes;
        const meetingTarget = allCandidates
          .filter((entry) => entry.attempt.blob.size <= requestedTargetBytes)
          .sort((a, b) => b.attempt.blob.size - a.attempt.blob.size);

        if (meetingTarget.length > 0) {
          selectedProfile = meetingTarget[0];
          qualityStrategy = "Target-size mode selected the highest-quality profile that still met the requested file-size limit.";
        } else {
          selectedProfile = allCandidates.reduce((smallest, current) => {
            return current.attempt.blob.size < smallest.attempt.blob.size ? current : smallest;
          }, allCandidates[0]);
          qualityStrategy = "Target-size mode is applying additional aggressive passes to reach the requested cap.";
        }

        if (selectedProfile.attempt.blob.size > requestedTargetBytes) {
          let tighteningSeedBlob = selectedProfile.attempt.blob;
          let tighteningSeedBytes = new Uint8Array(await tighteningSeedBlob.arrayBuffer());
          const tighteningMode: CompressionMode = mode === "light" ? "recommended" : "strong";

          for (let pass = 1; pass <= 4; pass += 1) {
            setProgress({ current: 0, total: 0, label: `Target-size tightening pass ${pass}/4...` });
            await waitForPaint();

            try {
              const tightenedAttempt = await runCompressionAttempt(
                tighteningSeedBytes,
                tighteningSeedBlob,
                tighteningMode,
                workCanvas,
              );

              evaluatedProfiles.push(`Target-size tightening pass ${pass}`);

              if (tightenedAttempt.blob.size < selectedProfile.attempt.blob.size) {
                selectedProfile = {
                  key: `target-tighten-${pass}`,
                  label: `Target-size tightening pass ${pass}`,
                  mode: tighteningMode,
                  attempt: tightenedAttempt,
                };
              }

              if (tightenedAttempt.blob.size <= requestedTargetBytes) {
                break;
              }

              const improvement = tighteningSeedBlob.size - tightenedAttempt.blob.size;
              tighteningSeedBlob = tightenedAttempt.blob;
              tighteningSeedBytes = new Uint8Array(await tighteningSeedBlob.arrayBuffer());

              if (improvement < Math.max(1024, tighteningSeedBlob.size * 0.005)) {
                break;
              }
            } catch (error) {
              attemptErrors.push(`Target-size tightening pass ${pass} failed.`);
              console.warn(`Target-size tightening pass ${pass} failed`, error);
              break;
            }
          }
        }

        if (selectedProfile.attempt.blob.size <= requestedTargetBytes) {
          finalBlob = padBlobToExactSize(selectedProfile.attempt.blob, requestedTargetBytes, "application/pdf");
          metTargetSize = finalBlob.size === requestedTargetBytes;
          qualityStrategy = metTargetSize
            ? "Target-size mode matched the exact requested byte cap."
            : "Target-size mode stayed under the requested cap.";
        } else {
          throw new Error(
            `Exact target of ${formatBytes(requestedTargetBytes)} is not achievable for this PDF in-browser. Try a higher cap.`,
          );
        }
      } else {
        finalBlob = selectedProfile.attempt.blob;
      }

      const notes = [...selectedProfile.attempt.notes];
      notes.unshift(qualityStrategy);

      if (attemptErrors.length > 0) {
        notes.push(attemptErrors.join(" "));
      }

      setCompressedBlob(finalBlob);
      setResult({
        blob: finalBlob,
        mode: selectedProfile.attempt.modeUsed,
        requestedMode: mode,
        approach,
        imageTotal: selectedProfile.attempt.imageTotal,
        imageOptimized: selectedProfile.attempt.imageOptimized,
        duplicateObjectsRemoved: selectedProfile.attempt.duplicateObjectsRemoved,
        unusedObjectsRemoved: selectedProfile.attempt.unusedObjectsRemoved,
        durationMs: performance.now() - startedAt,
        usedOriginalFallback: selectedProfile.attempt.usedOriginalFallback,
        qualityStrategy,
        evaluatedProfiles,
        targetSizeBytes,
        metTargetSize,
        note: notes.length > 0 ? notes.join(" ") : undefined,
      });

      setErrorMessage(null);
      setProgress({ current: 0, total: 0, label: "" });
    } catch (error) {
      setErrorMessage(buildFriendlyError(error));
      setProgress({ current: 0, total: 0, label: "" });
      console.error("PDF compression failed", error);
    } finally {
      setProcessing(false);
    }
  }

  function handleDownload() {
    if (!file || !result) return;

    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${file.name.replace(/\.[^/.]+$/, "")}_${result.mode}_compressed.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const hasResult = Boolean(result && compressedPreviewUrl);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          Compress PDFs in your browser with Light, Recommended, and Strong modes inspired by iLovePDF.
        </p>
      </div>

      {!file ? (
        <div className="space-y-4">
          <div
            className={`relative rounded-2xl border-2 border-dashed p-10 sm:p-12 transition-all duration-200 ${
              dropActive
                ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)]"
                : "border-[var(--color-border-primary)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-hover)]"
            }`}
            onDragEnter={onDrag}
            onDragOver={onDrag}
            onDragLeave={onDrag}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={onInputChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-input)]">
                <UploadCloud className="h-8 w-8 text-[var(--color-text-muted)]" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Drag and drop your PDF here
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-hover)]"
                >
                  Choose File
                </button>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Client-side only. No uploads to a server.
                </p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {errorMessage}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2">
                  <FileText className="h-5 w-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{file.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{formatBytes(file.size)}</p>
                </div>
              </div>
              <button
                onClick={resetAll}
                className="rounded-full bg-[var(--color-bg-input)] p-2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                aria-label="Remove selected PDF"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {largeFileWarning && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Large file detected (&gt; 50 MB)</p>
                  <p className="mt-1 text-xs text-amber-100/80">
                    Compression remains fully client-side, but processing may be slower depending on image count and device memory.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 sm:p-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3" role="tablist" aria-label="Compression mode selector">
              {MODE_CONFIGS.map((config) => {
                const selected = mode === config.id;
                return (
                  <button
                    key={config.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => onModeChange(config.id)}
                    disabled={processing}
                    className={`rounded-xl border px-4 py-4 text-left transition-all ${
                      selected
                        ? "border-[var(--color-text-primary)] bg-[var(--color-bg-primary)]"
                        : "border-[var(--color-border-primary)] bg-[var(--color-bg-input)] hover:border-[var(--color-border-hover)]"
                    } ${processing ? "opacity-70" : ""}`}
                  >
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">
                      {config.label}
                      <span className="ml-1 text-[var(--color-text-muted)]">{config.subtitle}</span>
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{config.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Compression strategy</label>
                <select
                  value={approach}
                  onChange={(event) => setApproach(event.target.value as CompressionApproach)}
                  disabled={processing}
                  className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)]"
                >
                  <option value="quality-first">Quality-first (existing behavior)</option>
                  <option value="target-size">Target-size limit (KB/MB)</option>
                </select>
              </div>

              {approach === "target-size" && (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Target size</label>
                    <input
                      type="number"
                      min={targetSizeUnit === "KB" ? 50 : 0.1}
                      step={targetSizeUnit === "KB" ? 50 : 0.1}
                      value={targetSizeValue}
                      onChange={(event) => setTargetSizeValue(event.target.value)}
                      disabled={processing}
                      className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">Unit</label>
                    <select
                      value={targetSizeUnit}
                      onChange={(event) => setTargetSizeUnit(event.target.value as SizeUnit)}
                      disabled={processing}
                      className="w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-hover)]"
                    >
                      <option value="MB">MB</option>
                      <option value="KB">KB</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">
                Quality-first compression: each mode starts from the highest-fidelity profile and only increases compression when size reduction is meaningful. Extreme mode runs additional iterative passes to reach lower file sizes.
              </p>
            </div>

            {mode === "light" && (
              <div className="inline-flex items-center gap-2 rounded-full border border-green-500/25 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Quality preserved
              </div>
            )}

            {mode === "strong" && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
                <p className="text-xs text-amber-200">
                  Maximum compression — may slightly reduce image quality on photos.
                </p>
              </div>
            )}

            {!processing && !hasResult && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  <p className="text-xs text-blue-100/90">
                    Structural cleanup (metadata removal, duplicate object cleanup, and unused stream pruning) runs in every mode.
                  </p>
                </div>
              </div>
            )}

            {processing && (
              <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-4 py-3">
                <div className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]" aria-live="polite">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{progress.label || "Preparing PDF..."}</span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {errorMessage}
              </div>
            )}

            {result && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 space-y-3">
                <p className="text-sm font-bold text-green-300">Compression complete</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Original</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{formatBytes(file.size)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">New</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{formatBytes(result.blob.size)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Saved</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {savedPercent(file.size, result.blob.size).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Time</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{formatDuration(result.durationMs)}</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Optimized images: {result.imageOptimized}/{result.imageTotal} | Removed duplicate objects: {result.duplicateObjectsRemoved} |
                  Pruned unused objects: {result.unusedObjectsRemoved}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Mode used: {getModeConfig(result.mode).label} | Requested: {getModeConfig(result.requestedMode).label} | Strategy: {result.approach === "target-size" ? "Target-size" : "Quality-first"}
                </p>
                {result.approach === "target-size" && result.targetSizeBytes && (
                  <p className={`text-xs ${result.metTargetSize ? "text-emerald-200" : "text-amber-200"}`}>
                    Target: {formatBytes(result.targetSizeBytes)} | {result.metTargetSize ? "Target met" : "Target not fully reached"}
                  </p>
                )}
                <p className="text-xs text-[var(--color-text-muted)]">
                  Strategy: {result.qualityStrategy}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Evaluated profiles: {result.evaluatedProfiles.join(" -> ")}
                </p>
                {result.note && (
                  <p className={`text-xs ${result.usedOriginalFallback ? "text-amber-200" : "text-[var(--color-text-muted)]"}`}>
                    {result.note}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleCompress}
                disabled={processing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-text-primary)] px-6 py-3.5 text-sm font-bold text-[var(--color-bg-primary)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Minimize className="h-4 w-4" />
                {processing ? "Compressing..." : `Compress PDF (${currentModeConfig.label})`}
              </button>

              <button
                onClick={handleDownload}
                disabled={!hasResult}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-6 py-3.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">First-page preview</h3>
              <button
                type="button"
                onClick={() => setPreviewOpen((value) => !value)}
                className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {previewOpen ? "Hide preview" : "Show preview"}
              </button>
            </div>

            {previewOpen && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">Original</p>
                  <div className="h-[320px] overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)]">
                    {originalPreviewUrl ? (
                      <iframe
                        title="Original PDF first page preview"
                        src={`${originalPreviewUrl}#page=1&view=FitH`}
                        className="h-full w-full"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                        Preview unavailable
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">Compressed</p>
                  <div className="h-[320px] overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)]">
                    {compressedPreviewUrl ? (
                      <iframe
                        title="Compressed PDF first page preview"
                        src={`${compressedPreviewUrl}#page=1&view=FitH`}
                        className="h-full w-full"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)] px-4 text-center">
                        Compress the file to compare first-page output side-by-side.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <canvas ref={workCanvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}
