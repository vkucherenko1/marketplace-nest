const assert = require("node:assert/strict");
const test = require("node:test");
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
