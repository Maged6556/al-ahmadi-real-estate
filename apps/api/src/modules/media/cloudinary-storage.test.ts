import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudinaryStorage } from "./cloudinary-storage.js";

const apiSecret = "cloudinary-test-secret";
const apiKey = "123456789";
const cloudName = "test-cloud";

function expectedSignature(parameters: Record<string, string>) {
  const canonical = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${canonical}${apiSecret}`).digest("hex");
}

describe("CloudinaryStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("signs server-side WebP uploads without exposing the API secret", async () => {
    const publicId = "al-ahmadi/listings/123/image";
    let requestUrl = "";
    let form: FormData | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requestUrl = String(input);
        if (!(init?.body instanceof FormData)) {
          throw new Error("Cloudinary upload did not send multipart data.");
        }
        form = init.body;
        return Response.json({
          public_id: publicId,
          secure_url: `https://res.cloudinary.com/${cloudName}/image/upload/v1/${publicId}.webp`,
          format: "webp",
          width: 800,
          height: 600,
        });
      }),
    );

    const storage = new CloudinaryStorage({ cloudName, apiKey, apiSecret });
    const uploaded = await storage.uploadImage({
      publicId,
      buffer: Buffer.from([1, 2, 3]),
    });

    expect(requestUrl).toBe(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    );
    expect(uploaded).toMatchObject({
      publicId,
      width: 800,
      height: 600,
    });
    expect(uploaded.url).toContain("res.cloudinary.com");
    expect(form?.get("api_key")).toBe(apiKey);
    expect(form?.get("public_id")).toBe(publicId);
    expect(form?.get("signature")).toBe(
      expectedSignature({
        public_id: publicId,
        timestamp: String(form?.get("timestamp")),
      }),
    );
    expect(String(form)).not.toContain(apiSecret);
    const uploadedFile = form?.get("file");
    expect(uploadedFile).toBeInstanceOf(Blob);
    if (uploadedFile instanceof Blob) {
      expect(uploadedFile.type).toBe("image/webp");
    }
  });

  it("signs destructive requests with CDN invalidation enabled", async () => {
    let form: FormData | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (!(init?.body instanceof FormData)) {
          throw new Error("Cloudinary delete did not send multipart data.");
        }
        form = init.body;
        return Response.json({ result: "ok" });
      }),
    );

    await new CloudinaryStorage({ cloudName, apiKey, apiSecret }).deleteImage(
      "al-ahmadi/listings/123/image",
    );

    expect(form?.get("invalidate")).toBe("true");
    expect(form?.get("signature")).toBe(
      expectedSignature({
        invalidate: "true",
        public_id: "al-ahmadi/listings/123/image",
        timestamp: String(form?.get("timestamp")),
      }),
    );
  });
});
