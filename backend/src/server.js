import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { ensureBootstrapAdmin } from "./services/authService.js";

let server;
let reconnectTimer;

async function connectWithRetry() {
  try {
    await connectDatabase();
    await ensureBootstrapAdmin();
    console.log("MongoDB bağlantısı hazır.");
  } catch (error) {
    console.error("MongoDB bağlantısı kurulamadı:", error.message);
    console.log("15 saniye sonra yeniden denenecek. Site bu sırada açılabilir.");
    reconnectTimer = setTimeout(connectWithRetry, 15000);
  }
}

function start() {
  server = app.listen(env.port, () => {
    console.log(`Evraqa sunucusu http://localhost:${env.port} adresinde çalışıyor.`);
  });
  connectWithRetry();
}

async function shutdown(signal) {
  console.log(`${signal} alındı, sunucu kapatılıyor...`);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
