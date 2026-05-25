export type PreparedImageAssets = {
  displayBlob: Blob;
  thumbBlob: Blob;
  previewUrl: string;
  imageBase64: string;
  mimeType: string;
};

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode the selected image."));
    };
    image.src = url;
  });
}

async function decodeImage(blob: Blob): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall back to HTMLImageElement decoding below for older or stricter browsers.
    }
  }

  const image = await loadImage(blob);
  return {
    source: image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    close: () => undefined,
  };
}

function resizeDecodedImage(
  decodedImage: { source: CanvasImageSource; width: number; height: number },
  maxEdge: number,
  quality: number,
): Promise<Blob> {
  const ratio = Math.min(1, maxEdge / Math.max(decodedImage.width, decodedImage.height));
  const width = Math.max(1, Math.round(decodedImage.width * ratio));
  const height = Math.max(1, Math.round(decodedImage.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available in this browser.");
  }

  context.drawImage(decodedImage.source, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (output) => {
        if (!output) {
          reject(new Error("Could not compress this image."));
          return;
        }
        resolve(output);
      },
      "image/webp",
      quality,
    );
  });
}

export async function prepareImageAssets(file: File): Promise<PreparedImageAssets> {
  const decodedImage = await decodeImage(file);

  try {
    const [displayBlob, thumbBlob] = await Promise.all([
      resizeDecodedImage(decodedImage, 1280, 0.84),
      resizeDecodedImage(decodedImage, 360, 0.8),
    ]);
    const [previewUrl, imageBase64] = [
      URL.createObjectURL(displayBlob),
      await blobToDataUrl(displayBlob).then((url) => url.split(",")[1] ?? ""),
    ];

    return {
      displayBlob,
      thumbBlob,
      previewUrl,
      imageBase64,
      mimeType: displayBlob.type || "image/webp",
    };
  } finally {
    decodedImage.close();
  }
}

export function releasePreparedImageAssets(assets?: PreparedImageAssets | null) {
  if (assets?.previewUrl) {
    URL.revokeObjectURL(assets.previewUrl);
  }
}
