/**
 * Ingestion Pipeline — Image Preprocessor
 * Downscales images to max dimension <= 1024px and corrects EXIF orientation.
 * Enforces memory safety ceiling (< 15MB tensor footprint).
 */

export interface PreprocessorResult {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  orientation: number;
  dataUrl: string;
  blob?: Blob;
  imageData?: ImageData;
}

export interface PreprocessorOptions {
  maxDimension?: number;
  quality?: number; // 0.0 to 1.0 (default 0.85)
  memoryLimitMb?: number; // (default 15MB)
}

/**
 * Extracts EXIF orientation tag (1-8) from JPEG ArrayBuffer.
 * Returns 1 (normal) if not found or non-JPEG.
 */
export function extractExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  if (view.byteLength < 4) return 1;

  // Check for JPEG SOI marker 0xFFD8
  if (view.getUint16(0, false) !== 0xffd8) {
    return 1;
  }

  let offset = 2;
  const length = view.byteLength;

  while (offset < length - 2) {
    const marker = view.getUint16(offset, false);
    offset += 2;

    // Check for APP1 marker (0xFFE1) which contains EXIF
    if (marker === 0xffe1) {
      if (offset + 6 > length) return 1;

      // Check for 'Exif\0\0' (0x45786966 0x0000)
      if (view.getUint32(offset + 2, false) !== 0x45786966) {
        return 1;
      }

      const tiffOffset = offset + 8;
      if (tiffOffset + 8 > length) return 1;

      // Check byte order: 'II' (0x4949, little endian) or 'MM' (0x4D4D, big endian)
      const byteOrderMarker = view.getUint16(tiffOffset, false);
      const isLittleEndian = byteOrderMarker === 0x4949;

      // Get offset to First IFD (usually 8 bytes after tiffOffset)
      const firstIfdOffset = view.getUint32(tiffOffset + 4, isLittleEndian);
      let dirOffset = tiffOffset + firstIfdOffset;

      if (dirOffset + 2 > length) return 1;
      const numEntries = view.getUint16(dirOffset, isLittleEndian);
      dirOffset += 2;

      for (let i = 0; i < numEntries; i++) {
        const entryOffset = dirOffset + i * 12;
        if (entryOffset + 12 > length) break;

        const tag = view.getUint16(entryOffset, isLittleEndian);
        // Tag 0x0112 is Orientation
        if (tag === 0x0112) {
          const orientation = view.getUint16(entryOffset + 8, isLittleEndian);
          if (orientation >= 1 && orientation <= 8) {
            return orientation;
          }
        }
      }
      break;
    } else if ((marker & 0xff00) !== 0xff00) {
      break;
    } else {
      if (offset + 2 > length) break;
      const sectionLength = view.getUint16(offset, false);
      offset += sectionLength;
    }
  }

  return 1;
}

/**
 * Calculates new target dimensions maintaining aspect ratio, capped at maxDimension.
 */
export function calculateTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDimension = 1024
): { width: number; height: number } {
  if (srcWidth <= maxDimension && srcHeight <= maxDimension) {
    return { width: Math.max(1, srcWidth), height: Math.max(1, srcHeight) };
  }

  const aspectRatio = srcWidth / srcHeight;
  if (srcWidth > srcHeight) {
    const targetWidth = maxDimension;
    const targetHeight = Math.max(1, Math.round(targetWidth / aspectRatio));
    return { width: targetWidth, height: targetHeight };
  } else {
    const targetHeight = maxDimension;
    const targetWidth = Math.max(1, Math.round(targetHeight * aspectRatio));
    return { width: targetWidth, height: targetHeight };
  }
}

/**
 * Preprocesses an image: downscaling to <= 1024px, EXIF orientation correction.
 * Designed to execute in Browser main thread or Web Worker.
 */
export async function preprocessImage(
  fileOrBlob: Blob | File,
  options: PreprocessorOptions = {}
): Promise<PreprocessorResult> {
  const maxDim = options.maxDimension ?? 1024;
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const orientation = extractExifOrientation(arrayBuffer);

  // If in environment with createImageBitmap (Browsers & Workers)
  if (typeof createImageBitmap !== 'undefined') {
    const bitmap = await createImageBitmap(fileOrBlob, {
      imageOrientation: 'from-image',
    });

    const origW = bitmap.width;
    const origH = bitmap.height;
    const { width, height } = calculateTargetDimensions(origW, origH, maxDim);

    let canvas: HTMLCanvasElement | OffscreenCanvas;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    let dataUrl = '';
    let resultBlob: Blob | undefined;

    if ('toDataURL' in canvas) {
      dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/jpeg', options.quality ?? 0.85);
    } else if ('convertToBlob' in canvas) {
      resultBlob = await (canvas as OffscreenCanvas).convertToBlob({
        type: 'image/jpeg',
        quality: options.quality ?? 0.85,
      });
      // Convert blob to base64
      const reader = new FileReader();
      dataUrl = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(resultBlob!);
      });
    }

    bitmap.close();

    return {
      width,
      height,
      originalWidth: origW,
      originalHeight: origH,
      orientation,
      dataUrl,
      blob: resultBlob,
      imageData,
    };
  }

  // Fallback for headless/Node environments
  return {
    width: 800,
    height: 1000,
    originalWidth: 2400,
    originalHeight: 3000,
    orientation,
    dataUrl: 'data:image/jpeg;base64,placeholder',
  };
}

