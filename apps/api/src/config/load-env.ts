import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const workspaceEnvPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../.env",
);

export function loadEnv() {
  if (!existsSync(workspaceEnvPath)) {
    return;
  }

  const result = config({ path: workspaceEnvPath, quiet: true });

  if (result.error) {
    throw new Error("Unable to load the workspace .env file.", {
      cause: result.error,
    });
  }
}
