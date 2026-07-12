// Prisma のユニーク制約違反(P2002)をダックタイピングで判定する。
// 生成されたクライアントのエラークラスをimportせずに済ませ、
// マスタ管理系画面(MST001〜005)などの重複エラーメッセージ表示に共通利用する。
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
