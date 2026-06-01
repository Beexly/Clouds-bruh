module.exports = {
  projectConfig: {
    redis_url: process.env.REDIS_URL,
    database_url: process.env.DATABASE_URL,
    database_type: "postgres",
    http_compression: {
      enabled: true,
      level: 6,
      memLevel: 8,
      strategy: 3,
    },
  },
  plugins: [],
};
