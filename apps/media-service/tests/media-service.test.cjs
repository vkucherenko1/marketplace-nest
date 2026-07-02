const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const test = require("node:test");
const sharp = require("sharp");
const { MediaService } = require("../dist/media.service.js");

test("media-service выдаёт signed ticket для изображения", async () => {
  const service = new MediaService();
  service.client = {
    bucketExists: async () => true,
    presignedPutObject: async (_bucket, object) =>
      `http://minio:9000/marketplace-media/${object}?X-Amz-Signature=test`,
  };
  const ticket = await service.signUpload("seller-1", {
    filename: "photo product.jpg",
    contentType: "image/jpeg",
    size: 1024,
  });

  assert.match(ticket.objectKey, /^seller-1\//);
  assert.match(ticket.uploadUrl, /X-Amz-Signature=/);
  assert.equal(ticket.requiredHeaders["content-type"], "image/jpeg");
  assert.match(ticket.completeToken, /^[a-f0-9]{64}$/);
  assert.match(ticket.thumbnailUrl, /-thumb\.webp$/);
});

test("media-service отклоняет не изображения и слишком большие файлы", async () => {
  const service = new MediaService();
  await assert.rejects(() =>
    service.signUpload("seller-1", {
      filename: "script.js",
      contentType: "application/javascript",
      size: 1024,
    }),
  );
  await assert.rejects(() =>
    service.signUpload("seller-1", {
      filename: "huge.jpg",
      contentType: "image/jpeg",
      size: 9 * 1024 * 1024,
    }),
  );
});

test("media-service финализирует upload в processed webp assets", async () => {
  const service = new MediaService();
  const stored = [];
  const sourceImage = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 120, g: 180, b: 220 },
    },
  })
    .png()
    .toBuffer();
  service.client = {
    bucketExists: async () => true,
    presignedPutObject: async (_bucket, object) =>
      `http://minio:9000/marketplace-media/${object}?X-Amz-Signature=test`,
    getObject: async () => Readable.from(sourceImage),
    putObject: async (_bucket, object) => {
      stored.push(object);
    },
    removeObject: async () => undefined,
  };
  const ticket = await service.signUpload("seller-1", {
    filename: "photo product.png",
    contentType: "image/png",
    size: 1024,
  });

  const asset = await service.completeUpload("seller-1", {
    objectKey: ticket.objectKey,
    completeToken: ticket.completeToken,
  });

  assert.match(asset.publicUrl, /\/processed\/.*\.webp$/);
  assert.match(asset.thumbnailUrl, /-thumb\.webp$/);
  assert.equal(stored.length, 2);
});
