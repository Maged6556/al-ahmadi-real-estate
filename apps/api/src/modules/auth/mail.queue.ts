import { Queue, Worker, type ConnectionOptions } from "bullmq";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface MailQueue {
  enqueue(message: MailMessage): Promise<void>;
  close(): Promise<void>;
}

interface MailProvider {
  send(message: MailMessage): Promise<void>;
}

class ResendMailProvider implements MailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: this.from, ...message }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Mail provider returned HTTP ${response.status}.`);
    }
  }
}

class DisabledMailQueue implements MailQueue {
  async enqueue(message: MailMessage) {
    void message;
    console.error(
      JSON.stringify({
        level: "error",
        event: "email_delivery_unavailable",
        reason: "RESEND_API_KEY is not configured",
      }),
    );
  }

  async close() {}
}

function redisConnection(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  const database = parsed.pathname.slice(1);
  const port = parsed.port ? Number(parsed.port) : 6379;

  return {
    host: parsed.hostname,
    port,
    ...(parsed.username
      ? { username: decodeURIComponent(parsed.username) }
      : {}),
    ...(parsed.password
      ? { password: decodeURIComponent(parsed.password) }
      : {}),
    ...(database ? { db: Number(database) } : {}),
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
}

export function createMailQueue(
  redisUrl: string,
  apiKey: string | undefined,
  from: string,
): MailQueue {
  if (!apiKey) return new DisabledMailQueue();

  const provider = new ResendMailProvider(apiKey, from);
  const connection = redisConnection(redisUrl);
  const queue = new Queue<MailMessage>("account-mail", { connection });
  const worker = new Worker<MailMessage>(
    "account-mail",
    (job) => provider.send(job.data),
    {
      connection,
      concurrency: 4,
    },
  );

  worker.on("failed", (job, error) => {
    console.error(
      JSON.stringify({
        level: "error",
        event: "email_delivery_attempt_failed",
        attemptsMade: job?.attemptsMade,
        errorName: error.name,
      }),
    );
  });
  worker.on("error", (error) => {
    console.error(
      JSON.stringify({
        level: "error",
        event: "email_worker_error",
        errorName: error.name,
      }),
    );
  });

  return {
    async enqueue(message) {
      try {
        await queue.add("send", message, {
          attempts: 5,
          backoff: { type: "exponential", delay: 1_000 },
          removeOnComplete: true,
          removeOnFail: true,
        });
      } catch (error) {
        console.error(
          JSON.stringify({
            level: "error",
            event: "email_enqueue_failed",
            errorName: error instanceof Error ? error.name : "UnknownError",
          }),
        );
      }
    },
    async close() {
      await Promise.all([worker.close(), queue.close()]);
    },
  };
}
