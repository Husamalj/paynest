Object.assign(process.env, {
  NODE_ENV: "test",
  JWT_SECRET: process.env.JWT_SECRET || "test-jwt-secret-change-me",
});
