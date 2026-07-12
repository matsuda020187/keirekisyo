import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // 通常のCLI操作(migrate/studio等)はプーリングを経由しない直接接続を使う。
    url: env("DIRECT_URL"),
  },
});
