import type { DefaultSession } from "next-auth";
import type { AccountRole } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      employeeId?: string;
      role?: AccountRole;
    } & DefaultSession["user"];
  }
}

// next-auth/jwt はこのインターフェースを "@auth/core/jwt" から再エクスポートしているだけで、
// コールバックの型はそちらを直接参照している。モジュール拡張は宣言元を対象にする必要がある。
declare module "@auth/core/jwt" {
  interface JWT {
    employeeId?: string;
    role?: AccountRole;
  }
}
