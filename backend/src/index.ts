import { serve } from "@hono/node-server";
import app from "./app.js";

export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT ?? 8080);

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`sniper api listening on http://localhost:${info.port}`);
  });
}
