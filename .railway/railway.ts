export default {
  build: {
    builder: "DOCKER",
    dockerfile: "apps/api/Dockerfile",
  },
  deploy: {
    restartPolicyType: "ON_FAILURE",
    restartPolicyMaxRetries: 10,
  },
};
