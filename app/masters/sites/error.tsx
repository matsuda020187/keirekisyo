"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <p className="text-gray-700">現場マスタの読み込み中にエラーが発生しました。</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
      >
        再試行
      </button>
    </main>
  );
}
