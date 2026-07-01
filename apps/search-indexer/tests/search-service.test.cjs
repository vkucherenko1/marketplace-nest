const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const { SearchService } = require("../dist/search.service.js");

async function withServer(handler, callback) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("search fallback возвращает catalog response, если Meilisearch недоступен", async () => {
  await withServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 1,
      }),
    );
  }, async (catalogUrl) => {
    process.env.CATALOG_SERVICE_URL = catalogUrl;
    process.env.MEILI_URL = "http://127.0.0.1:1";
    const result = await new SearchService().search({ page: "1", pageSize: "20" });
    assert.deepEqual(result, {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });
  });
});
