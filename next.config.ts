import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // REF005のPDF生成(lib/resume-pdf-document.tsx)がfsで読み込む日本語フォントを
  // Vercelのサーバーレス関数バンドルに含める(次の行がないとfetch時にファイルが見つからない)。
  outputFileTracingIncludes: {
    "/api/resume-pdf/**": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
