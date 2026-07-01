import { BadRequestException, Injectable } from "@nestjs/common";
import * as Minio from "minio";
import type {
  MediaUploadRequest,
  MediaUploadTicket,
} from "@marketplace/contracts";

@Injectable()
export class MediaService {
  private readonly bucket = process.env.MINIO_BUCKET ?? "marketplace-media";
  private readonly client = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ROOT_USER ?? "marketplace",
    secretKey: process.env.MINIO_ROOT_PASSWORD ?? "marketplace-secret",
  });

  async signUpload(
    userId: string,
    input: MediaUploadRequest,
  ): Promise<MediaUploadTicket> {
    if (!input.contentType.startsWith("image/")) {
      throw new BadRequestException("Only image uploads are allowed");
    }
    if (input.size > 8 * 1024 * 1024) {
      throw new BadRequestException("Image is too large");
    }

    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
    const objectKey = `${userId}/${Date.now()}-${safeName}`;
    const expiresIn = 900;
    const publicBaseUrl =
      process.env.MEDIA_PUBLIC_BASE_URL ?? "http://localhost:9000";
    await this.ensureBucket();
    const internalUploadUrl = await this.client.presignedPutObject(
      this.bucket,
      objectKey,
      expiresIn,
    );
    const uploadUrl = internalUploadUrl.replace(
      process.env.MINIO_INTERNAL_PUBLIC_ORIGIN ?? "http://minio:9000",
      process.env.MINIO_BROWSER_PUBLIC_ORIGIN ?? "http://localhost:9000",
    );

    return {
      objectKey,
      uploadUrl,
      publicUrl: `${publicBaseUrl}/${this.bucket}/${objectKey}`,
      expiresIn,
      requiredHeaders: {
        "content-type": input.contentType,
      },
    };
  }

  private async ensureBucket(): Promise<void> {
    if (!(await this.client.bucketExists(this.bucket))) {
      await this.client.makeBucket(this.bucket, "us-east-1");
      // Локально делаем bucket публичным для чтения, чтобы карточки могли
      // сразу показывать загруженные изображения через publicUrl.
      await this.client.setBucketPolicy(
        this.bucket,
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        }),
      );
    }
  }
}
