import type { PublicUser } from "../modules/auth/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      authUser?: PublicUser;
    }
  }
}

export {};
