const assert = require("node:assert/strict");

const apiUrl = process.env.REGRESSION_API_URL ?? "http://localhost:8080/api/v1";
const concurrency = Number(process.env.LOAD_SMOKE_CONCURRENCY ?? 40);

async function main() {
  const startedAt = performance.now();
  const responses = await Promise.all(
    Array.from({ length: concurrency }, (_, index) =>
      fetch(`${apiUrl}/products?page=${(index % 3) + 1}&pageSize=20`),
    ),
  );
  const elapsed = performance.now() - startedAt;

  for (const response of responses) {
    assert.equal(response.status, 200);
  }

  console.log(
    `load-smoke ok: ${concurrency} parallel catalog requests in ${Math.round(elapsed)}ms`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
