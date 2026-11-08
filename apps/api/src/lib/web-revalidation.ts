import { AppError } from "./app-error.js";

export async function revalidateWebsite(
  url: string,
  secret: string,
  slug?: string,
) {
  const tags = slug ? ["listings", `listing:${slug}`] : ["listings"];
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-web-revalidation-secret": secret,
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    console.error(
      JSON.stringify({
        level: "error",
        event: "website_revalidation_failed",
        reason: "unreachable",
      }),
    );
    throw new AppError(
      503,
      "CACHE_REVALIDATION_FAILED",
      "The listing change was saved, but public cache refresh failed.",
    );
  }

  if (!response.ok) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "website_revalidation_failed",
        status: response.status,
      }),
    );
    throw new AppError(
      503,
      "CACHE_REVALIDATION_FAILED",
      "The listing change was saved, but public cache refresh failed.",
    );
  }
}
