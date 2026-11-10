import { createServer } from "node:http";
import { handler } from "../src/lambda";
import { Logger } from "../src/shared/logger";

const logger = new Logger("TracksDevServer");

const PORT = Number(process.env.PORT ?? 3000);

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end('{"status":"ok"}');
    return;
  }

  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([name, value]) => [name, Array.isArray(value) ? value.join(",") : value]),
  );

  handler({
    rawPath: url.pathname,
    headers,
    queryStringParameters: url.searchParams.size > 0 ? Object.fromEntries(url.searchParams) : undefined,
    requestContext: { http: { method: request.method ?? "GET" } },
  })
    .then((result) => {
      response.writeHead(result.statusCode, {
        ...result.headers,
        "Content-Length": Buffer.byteLength(result.body),
      });
      response.end(result.body);
    })
    .catch(() => {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end('{"error":{"code":"INTERNAL_ERROR","status":500}}');
    });
}).listen(PORT, () => {
  logger.log(`Dev server listening on :${PORT}.`);
});
