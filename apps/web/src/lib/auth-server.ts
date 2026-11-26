import { cookies } from "next/headers";

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export async function getServerAuth(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    const base = apiBase.replace(/\/+$/, "");

    const response = await fetch(`${base}/api/auth/me`, {
      headers: {
        accept: "application/json",
        cookie: cookieStore.toString(),
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      data: { user: AuthUser };
    };
    return data.data.user;
  } catch {
    return null;
  }
}
