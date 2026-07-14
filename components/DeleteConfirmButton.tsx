"use client";

import { useRef, useState, useTransition } from "react";

// CMN001 削除確認モーダル。EDT005・EDT007・MST001〜005など、
// 削除/危険操作の確認ダイアログを持つ全画面で共有する。
type Props = {
  message: string;
  action: () => Promise<{ error?: string }>;
  triggerLabel?: string;
  danger?: boolean;
};

export function DeleteConfirmButton({
  message,
  action,
  triggerLabel = "削除",
  danger = true,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          dialogRef.current?.showModal();
        }}
        className={
          danger
            ? "rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
            : "rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
        }
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-md p-6 backdrop:bg-black/30 open:flex open:flex-col open:gap-4"
      >
        <p>{message}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await action();
                if (result?.error) {
                  setError(result.error);
                } else {
                  dialogRef.current?.close();
                }
              });
            }}
            className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "実行中..." : "実行"}
          </button>
        </div>
      </dialog>
    </>
  );
}
