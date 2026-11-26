import { defineRailwayConfig } from "@railway/cli";

export default defineRailwayConfig({
  build: {
    builder: "DOCKER",
    dockerfile: "apps/api/Dockerfile",
  },
  deploy: {
    restartPolicyType: "ON_FAILURE",
    restartPolicyMaxRetries: 10,
  },
});
