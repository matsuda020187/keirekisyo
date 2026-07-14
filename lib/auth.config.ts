import type { NextAuthConfig } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

// プロバイダ設定のみを分離。Prismaに依存するsignIn/jwtコールバックはlib/auth.tsに置く。
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    // 開発環境限定のダミーログイン。本番ビルドには含まれない(docs/decisions.md参照)。
    // 実在のuser_accountとの突合はlib/auth.tsのsignInコールバックで行う(他プロバイダと同じ経路)。
    ...(process.env.NODE_ENV !== "production"
      ? [
          Credentials({
            id: "dev-credentials",
            name: "開発用ログイン",
            credentials: {
              email: { label: "メールアドレス", type: "email" },
            },
            async authorize(credentials) {
              const email = credentials?.email;
              if (typeof email !== "string" || !email) return null;
              return { id: email, email };
            },
          }),
        ]
      : []),
  ],
};
