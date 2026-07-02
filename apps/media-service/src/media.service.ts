import { BadRequestException, Injectable } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import sharp from "sharp";
import * as Minio from "minio";
import type {
  CompleteMediaUploadRequest,
  MediaAsset,
  MediaUploadRequest,
  MediaUploadTicket,
} from "@marketplace/contracts";

@Injectable()
export class MediaService {
  private readonly bucket = process.env.MINIO_BUCKET ?? "marketplace-media";
  private readonly signingSecret =
    process.env.MEDIA_SIGNING_SECRET ?? "local-media-signing-secret";
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
    const uploadId = randomUUID();
    const objectKey = `${userId}/incoming/${uploadId}-${safeName}`;
    const expiresIn = 900;
    const publicBaseUrl =
      process.env.MEDIA_PUBLIC_BASE_URL ?? "http://localhost:9000";
    const publicUrl = `${publicBaseUrl}/${this.bucket}/${this.originalAssetKey(objectKey)}`;
    const thumbnailUrl = `${publicBaseUrl}/${this.bucket}/${this.thumbnailAssetKey(objectKey)}`;
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
      publicUrl,
      thumbnailUrl,
      completeToken: this.signCompleteToken(userId, objectKey, publicUrl),
      expiresIn,
      requiredHeaders: {
        "content-type": input.contentType,
      },
    };
  }

  async completeUpload(
    userId: string,
    input: CompleteMediaUploadRequest,
  ): Promise<MediaAsset> {
    await this.ensureBucket();
    const publicBaseUrl =
      process.env.MEDIA_PUBLIC_BASE_URL ?? "http://localhost:9000";
    const publicUrl = `${publicBaseUrl}/${this.bucket}/${this.originalAssetKey(input.objectKey)}`;
    this.verifyCompleteToken(userId, input.objectKey, publicUrl, input.completeToken);

    const source = await this.readObjectBuffer(input.objectKey);
    const image = sharp(source).rotate();
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      throw new BadRequestException("Unsupported image file");
    }

    // Храним уже нормализованные webp-версии, чтобы фронт и каталог
    // читали предсказуемые по размеру файлы, а не сырые оригиналы.
    const [originalBuffer, thumbnailBuffer] = await Promise.all([
      image
        .clone()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 84 })
        .toBuffer(),
      image
        .clone()
        .resize({ width: 480, height: 480, fit: "cover", position: "centre" })
        .webp({ quality: 76 })
        .toBuffer(),
    ]);

    const originalKey = this.originalAssetKey(input.objectKey);
    const thumbnailKey = this.thumbnailAssetKey(input.objectKey);
    await Promise.all([
      this.client.putObject(
        this.bucket,
        originalKey,
        originalBuffer,
        originalBuffer.length,
        {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      ),
      this.client.putObject(
        this.bucket,
        thumbnailKey,
        thumbnailBuffer,
        thumbnailBuffer.length,
        {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      ),
    ]);
    await this.client.removeObject(this.bucket, input.objectKey).catch(() => undefined);

    const finalMetadata = await sharp(originalBuffer).metadata();
    return {
      objectKey: originalKey,
      publicUrl,
      thumbnailUrl: `${publicBaseUrl}/${this.bucket}/${thumbnailKey}`,
      width: finalMetadata.width ?? metadata.width,
      height: finalMetadata.height ?? metadata.height,
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

  private originalAssetKey(objectKey: string): string {
    return this.assetBaseKey(objectKey, "original") + ".webp";
  }

  private thumbnailAssetKey(objectKey: string): string {
    return this.assetBaseKey(objectKey, "thumbnail") + ".webp";
  }

  private assetBaseKey(objectKey: string, kind: "original" | "thumbnail"): string {
    const normalized = objectKey.replace("/incoming/", "/processed/");
    const trimmed = normalized.replace(/\.[^.]+$/, "");
    return kind === "thumbnail" ? `${trimmed}-thumb` : trimmed;
  }

  private signCompleteToken(
    userId: string,
    objectKey: string,
    publicUrl: string,
  ): string {
    return createHmac("sha256", this.signingSecret)
      .update(`${userId}:${objectKey}:${publicUrl}`)
      .digest("hex");
  }

  private verifyCompleteToken(
    userId: string,
    objectKey: string,
    publicUrl: string,
    token: string,
  ): void {
    const expected = this.signCompleteToken(userId, objectKey, publicUrl);
    const left = Buffer.from(token);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new BadRequestException("Invalid upload completion token");
    }
  }

  private async readObjectBuffer(objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectKey).catch(() => null);
    if (!stream) {
      throw new BadRequestException("Uploaded file was not found");
    }
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
