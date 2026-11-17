import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const revalidationRequestSchema = z.object({
  tags: z.array(z.string().regex(/^(listings|listing:[\p{L}\p{N}-]+)$/u)).min(1).max(10),
}).strict();

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

  const parsedBody = revalidationRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid tags" }, { status: 400 });
  }

  for (const tag of parsedBody.data.tags) {
    revalidateTag(tag, "max");
  }

  return NextResponse.json({ revalidated: parsedBody.data.tags });
}
