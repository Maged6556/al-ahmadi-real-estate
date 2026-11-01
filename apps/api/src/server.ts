import Redis from "ioredis";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { loadEnv } from "./config/load-env.js";
import { parseEnv } from "./config/env.js";
import { accountLifecycleRepository } from "./modules/auth/account-lifecycle.repository.js";
import { AccountLifecycleService } from "./modules/auth/account-lifecycle.service.js";
import { createMailQueue } from "./modules/auth/mail.queue.js";

loadEnv();

const env = parseEnv(process.env);
const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});
const mailQueue = createMailQueue(
  env.REDIS_URL,
  env.RESEND_API_KEY,
  env.EMAIL_FROM ?? "Al-ahmadi <no-reply@example.com>",
);
const accountLifecycle = new AccountLifecycleService(
  accountLifecycleRepository,
  mailQueue,
  { webBaseUrl: env.WEB_BASE_URL },
);
const app = createApp(env, { redisClient: redis, accountLifecycle });
async function purgeExpiredEmailTokens() {
  try {
    await prisma.emailToken.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "expired_email_token_cleanup_failed",
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
  }
}

void purgeExpiredEmailTokens();
const emailTokenCleanupTimer = setInterval(
  () => void purgeExpiredEmailTokens(),
  24 * 60 * 60 * 1000,
);
emailTokenCleanupTimer.unref();

const server = app.listen(env.API_PORT, "0.0.0.0", () => {
  console.info(`API listening on port ${env.API_PORT}`);
});

function shutdown() {
  clearInterval(emailTokenCleanupTimer);
  server.close((error) => {
    if (error) {
      console.error("API shutdown failed.");
      process.exitCode = 1;
    }

    void Promise.allSettled([mailQueue.close(), prisma.$disconnect()]).then(
      (results) => {
        redis.disconnect();
        if (results.some((result) => result.status === "rejected")) {
          console.error(
            JSON.stringify({
              level: "error",
              event: "api_shutdown_failed",
            }),
          );
          process.exitCode = 1;
        }
      },
    );
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
