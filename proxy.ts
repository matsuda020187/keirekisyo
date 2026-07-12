import { auth } from "@/lib/auth";

// Next.js 16: proxyはnodejsランタイム固定(edge非対応)のため、
// Prismaを含む本設定(lib/auth.ts)をそのまま使ってよい。
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
