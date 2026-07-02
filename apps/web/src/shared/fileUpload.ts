export interface UploadedImage {
  id: string;
  name: string;
  type: string;
  size: number;
  file: File;
  dataUrl: string;
  publicUrl?: string;
  thumbnailUrl?: string;
}

export async function readImageFiles(files: FileList | File[]): Promise<UploadedImage[]> {
  const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
  return Promise.all(
    images.map(
      (file) =>
        new Promise<UploadedImage>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: `${file.name}-${file.size}-${file.lastModified}`,
              name: file.name,
              type: file.type,
              size: file.size,
              file,
              dataUrl: String(reader.result),
            });
          reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
          reader.readAsDataURL(file);
        }),
    ),
  );
}
