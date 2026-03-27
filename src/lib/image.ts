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

async function resizeImage(blob: Blob, maxEdge: number, quality: number): Promise<Blob> {
  const image = await loadImage(blob);
  const ratio = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);

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
  const displayBlob = await resizeImage(file, 1280, 0.84);
  const thumbBlob = await resizeImage(displayBlob, 360, 0.8);
  const previewUrl = URL.createObjectURL(displayBlob);
  const imageBase64 = (await blobToDataUrl(displayBlob)).split(",")[1] ?? "";

  return {
    displayBlob,
    thumbBlob,
    previewUrl,
    imageBase64,
    mimeType: displayBlob.type || "image/webp",
  };
}

export function releasePreparedImageAssets(assets?: PreparedImageAssets | null) {
  if (assets?.previewUrl) {
    URL.revokeObjectURL(assets.previewUrl);
  }
}
