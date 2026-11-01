import type { Redis } from "ioredis";
import { rateLimit, type RateLimitRequestHandler } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";

export type ApiRateLimiters = {
  global: RateLimitRequestHandler;
  auth: RateLimitRequestHandler;
  login: RateLimitRequestHandler;
  register: RateLimitRequestHandler;
};

function createLimiter(
  redis: Redis,
  prefix: string,
  windowMs: number,
  limit: number,
): RateLimitRequestHandler {
  const sendCommand = async (...args: string[]): Promise<RedisReply> => {
    const [command, ...commandArgs] = args;
    if (!command) {
      throw new Error("A Redis command is required for the rate-limit store.");
    }

    const reply: unknown = await redis.call(command, commandArgs);

    if (
      typeof reply === "boolean" ||
      typeof reply === "number" ||
      typeof reply === "string"
    ) {
      return reply;
    }

    if (
      Array.isArray(reply) &&
      reply.every(
        (value) =>
          typeof value === "boolean" ||
          typeof value === "number" ||
          typeof value === "string",
      )
    ) {
      return reply;
    }

    throw new Error("Redis returned an unsupported rate-limit response.");
  };

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: new RedisStore({
      prefix: `al-ahmadi:rate-limit:${prefix}:`,
      sendCommand,
    }),
    handler: (request, response) => {
      response.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          requestId: request.requestId,
        },
      });
    },
  });
}

export function createApiRateLimiters(redis: Redis): ApiRateLimiters {
  return {
    global: createLimiter(redis, "global", 15 * 60 * 1000, 300),
    auth: createLimiter(redis, "auth", 15 * 60 * 1000, 30),
    login: createLimiter(redis, "login", 15 * 60 * 1000, 10),
    register: createLimiter(redis, "register", 60 * 60 * 1000, 5),
  };
}
