import { createServer as createViteServer } from "vite";
import { initializeDbFromSupabase } from "./server/db";
import app from "./api/handler";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3005;

async function startServer() {
  await initializeDbFromSupabase();

  // In dev, proxy frontend through Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`WellDropp server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
