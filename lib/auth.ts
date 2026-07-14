import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import type { AuthProvider } from "@/generated/prisma/client";

// user_account.auth_provider と NextAuth の account.provider 文字列の対応。
// docs/schema.mdの「ログイン判定ロジック」参照。
const PROVIDER_MAP: Record<string, AuthProvider> = {
  "microsoft-entra-id": "AZURE_AD",
  google: "GOOGLE",
  github: "GITHUB",
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // user_account/employeeが唯一のアカウント管理テーブルであり、
  // Auth.js標準のUser/Account/Sessionテーブルとは別方式(docs/decisions.md参照)。
  // そのためadapterは使わず、signIn/jwtコールバックで直接突合・確定させる。
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      // 開発環境限定のダミーログイン(lib/auth.config.ts参照)。
      // 本番では登録されないプロバイダなので、NODE_ENVに関わらずここでの分岐は安全。
      if (account.provider === "dev-credentials") {
        const userAccount = await prisma.userAccount.findUnique({
          where: { email: user.email },
          include: { employee: true },
        });
        if (!userAccount) return "/login?error=unregistered";
        if (userAccount.employee.employmentStatus === "RETIRED") {
          return "/login?error=retired";
        }
        await prisma.userAccount.update({
          where: { id: userAccount.id },
          data: { lastLoginAt: new Date() },
        });
        return true;
      }

      const provider = PROVIDER_MAP[account.provider];
      if (!provider) return false;

      const userAccount = await prisma.userAccount.findUnique({
        where: { email: user.email },
        include: { employee: true },
      });

      // AUTH001: 未登録エラー
      if (!userAccount) return "/login?error=unregistered";

      // AUTH001: 退職済みエラー
      if (userAccount.employee.employmentStatus === "RETIRED") {
        return "/login?error=retired";
      }

      if (userAccount.externalId === null) {
        // 初回ログイン: external_id / auth_provider を確定する
        const isHrSales = userAccount.role === "HR_SALES";
        await prisma.userAccount.update({
          where: { id: userAccount.id },
          data: {
            externalId: account.providerAccountId,
            authProvider: provider,
            lastLoginAt: new Date(),
          },
        });
        // 人事・営業は経歴書を作成しないためEDT001を経ずis_registeredを自動確定する
        if (isHrSales) {
          await prisma.employee.update({
            where: { employeeId: userAccount.employeeId },
            data: {
              isRegistered: true,
              name: userAccount.employee.name ?? user.name ?? undefined,
            },
          });
        }
        return true;
      }

      // AUTH001: プロバイダ不一致エラー(external_idの不一致も含む)
      if (
        userAccount.authProvider !== provider ||
        userAccount.externalId !== account.providerAccountId
      ) {
        return "/login?error=provider_mismatch";
      }

      await prisma.userAccount.update({
        where: { id: userAccount.id },
        data: { lastLoginAt: new Date() },
      });
      return true;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const userAccount = await prisma.userAccount.findUnique({
          where: { email: user.email },
        });
        if (userAccount) {
          token.employeeId = userAccount.employeeId;
          token.role = userAccount.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.employeeId = token.employeeId;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
