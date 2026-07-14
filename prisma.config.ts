import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // DIRECT_URL/SHADOW_DATABASE_URLはmigrate・studio等のローカルCLI操作専用。
  // Vercelビルド(prisma generate)はDB接続不要のため、未設定ならdatasourceごと省略する。
  ...(process.env.DIRECT_URL
    ? {
        datasource: {
          // 通常のCLI操作(migrate/studio等)はプーリングを経由しない直接接続を使う。
          url: process.env.DIRECT_URL,
          // Neonの通常ロールにはCREATE DATABASE権限がなくshadow DBを自動作成できないため、
          // Neon側に別途用意したshadow用データベースを指す接続文字列を使う。
          ...(process.env.SHADOW_DATABASE_URL
            ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
            : {}),
        },
      }
    : {}),
});
