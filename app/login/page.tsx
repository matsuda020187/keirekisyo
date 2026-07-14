import { signIn } from "@/lib/auth";

const ERROR_MESSAGES: Record<string, string> = {
  unregistered:
    "このメールアドレスは登録されていません。管理者に新規登録を依頼してください。",
  retired:
    "このアカウントは無効化されています。心当たりがない場合は管理者にお問い合わせください。",
  provider_mismatch:
    "このアカウントは別のログイン方法で登録されています。初回に使用したログイン方法をお使いください。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">業務経歴書 ログイン</h1>

      {errorMessage && (
        <p className="max-w-sm rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="flex w-full max-w-xs flex-col gap-3">
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id");
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Microsoftアカウントでログイン
          </button>
        </form>

        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            Googleアカウントでログイン
          </button>
        </form>

        <form
          action={async () => {
            "use server";
            await signIn("github");
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-gray-800 px-4 py-2 text-white hover:bg-gray-900"
          >
            GitHubアカウントでログイン
          </button>
        </form>

        {process.env.NODE_ENV !== "production" && (
          <form
            action={async (formData) => {
              "use server";
              await signIn("dev-credentials", {
                email: formData.get("email"),
                redirectTo: "/",
              });
            }}
            className="mt-4 flex flex-col gap-2 border-t border-dashed border-gray-300 pt-4"
          >
            <p className="text-xs text-gray-500">
              開発用ログイン(本番では表示されません)
            </p>
            <input
              type="email"
              name="email"
              required
              placeholder="user_account.emailに登録済みのメールアドレス"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-md border border-dashed border-gray-400 px-4 py-2 text-sm hover:bg-gray-50"
            >
              開発用ログイン
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
