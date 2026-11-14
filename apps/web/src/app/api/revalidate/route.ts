import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isRevalidationRequest(body: unknown): body is { tags: string[] } {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !("tags" in body) ||
    !Array.isArray(body.tags) ||
    body.tags.length < 1 ||
    body.tags.length > 10
  ) {
    return false;
  }

  return body.tags.every(
    (tag) =>
      typeof tag === "string" &&
      /^(listings|listing:[\p{L}\p{N}-]+)$/u.test(tag),
  );
}

export async function POST(request: Request) {
  const expectedSecret = process.env.WEB_REVALIDATION_SECRET;
  const providedSecret = request.headers.get("x-web-revalidation-secret");
  if (!expectedSecret || !providedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expected = Buffer.from(expectedSecret);
  const provided = Buffer.from(providedSecret);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRevalidationRequest(body)) {
    return NextResponse.json({ error: "Invalid tags" }, { status: 400 });
  }

  for (const tag of body.tags) {
    revalidateTag(tag, "max");
  }

  return NextResponse.json({ revalidated: body.tags });
}
