import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

export function createApp() {
  const server = createServer((_req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "archon-treasury-api" }));
  });

  return server;
}
