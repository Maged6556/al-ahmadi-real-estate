import { headers } from "next/headers";

export async function getCspNonce(): Promise<string> {
  const nonce = (await headers()).get("x-csp-nonce");
  if (!nonce) throw new Error("CSP nonce is missing from the request.");
  return nonce;
}
