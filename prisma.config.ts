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
    // Neonの通常ロールにはCREATE DATABASE権限がなくshadow DBを自動作成できないため、
    // Neon側に別途用意したshadow用データベースを指す接続文字列を使う。
    shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
