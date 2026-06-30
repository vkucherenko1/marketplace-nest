export interface UploadedImage {
  id: string;
  name: string;
  dataUrl: string;
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
              dataUrl: String(reader.result),
            });
          reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
          reader.readAsDataURL(file);
        }),
    ),
  );
}
