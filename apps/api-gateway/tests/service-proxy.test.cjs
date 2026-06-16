const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const { ServiceProxy } = require("../dist/service-proxy.service.js");
const { GatewayController } = require("../dist/gateway.controller.js");

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

test("proxy передаёт method, JSON body и authorization", async () => {
  await withServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        method: request.method,
        authorization: request.headers.authorization,
        body: JSON.parse(body),
      }),
    );
  }, async (baseUrl) => {
    const result = await new ServiceProxy().request(baseUrl, "echo", {
      method: "POST",
      authorization: "Bearer token",
      body: { value: 42 },
    });
    assert.deepEqual(result, {
      method: "POST",
      authorization: "Bearer token",
      body: { value: 42 },
    });
  });
});

test("proxy сохраняет HTTP-статус ошибки upstream", async () => {
  await withServer((_request, response) => {
    response.writeHead(409, { "content-type": "application/json" });
    response.end(JSON.stringify({ message: "Conflict" }));
  }, async (baseUrl) => {
    await assert.rejects(
      new ServiceProxy().request(baseUrl, "failure"),
      (error) => error.getStatus() === 409,
    );
  });
});

test("proxy корректно обрабатывает ответ 204", async () => {
  await withServer((_request, response) => {
    response.writeHead(204);
    response.end();
  }, async (baseUrl) => {
    const result = await new ServiceProxy().request(baseUrl, "empty");
    assert.equal(result, undefined);
  });
});

test("gateway кодирует фильтры каталога в query string", async () => {
  let requestedPath = "";
  const controller = new GatewayController({
    request: async (_baseUrl, path) => {
      requestedPath = path;
      return { items: [] };
    },
  });

  await controller.products({
    search: "детские игрушки",
    page: "2",
    category: ["toys", "sale"],
  });

  assert.equal(
    requestedPath,
    "products?search=%D0%B4%D0%B5%D1%82%D1%81%D0%BA%D0%B8%D0%B5+%D0%B8%D0%B3%D1%80%D1%83%D1%88%D0%BA%D0%B8&page=2&category=toys&category=sale",
  );
});
