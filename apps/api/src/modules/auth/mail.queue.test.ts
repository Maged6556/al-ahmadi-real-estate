import { beforeEach, describe, expect, it, vi } from "vitest";

const { add } = vi.hoisted(() => ({ add: vi.fn() }));

vi.mock("bullmq", () => ({
  Queue: class {
    add = add;
    close = vi.fn().mockResolvedValue(undefined);
  },
  Worker: class {
    on = vi.fn().mockReturnThis();
    close = vi.fn().mockResolvedValue(undefined);
  },
}));

import { createMailQueue } from "./mail.queue.js";

const message = {
  to: "person@example.com",
  subject: "Verify your email address",
  html: "<p>Verify</p>",
  text: "Verify",
};

describe("createMailQueue", () => {
  beforeEach(() => {
    add.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("reports when a message cannot be added to Redis", async () => {
    add.mockRejectedValue(new Error("Redis unavailable"));
    const queue = createMailQueue("redis://localhost:6379", "test-key", "test");

    await expect(queue.enqueue(message)).rejects.toMatchObject({
      statusCode: 503,
      code: "EMAIL_QUEUE_UNAVAILABLE",
    });
  });

  it("reports when email delivery is not configured", async () => {
    const queue = createMailQueue("redis://localhost:6379", undefined, "test");

    await expect(queue.enqueue(message)).rejects.toMatchObject({
      statusCode: 503,
      code: "EMAIL_UNAVAILABLE",
    });
  });
});
