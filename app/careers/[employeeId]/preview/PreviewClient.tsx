"use client";

import Link from "next/link";
import { useRef } from "react";

type Props = {
  pdfUrl: string;
  employeeId: string;
  backHref: string;
};

export function PreviewClient({ pdfUrl, employeeId, backHref }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <div className="flex justify-between">
        <Link href={backHref} className="text-sm text-blue-600 hover:underline">
          戻る
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => iframeRef.current?.contentWindow?.print()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            印刷
          </button>
          <a
            href={pdfUrl}
            download={`resume-${employeeId}.pdf`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            ダウンロード
          </a>
        </div>
      </div>

      <iframe ref={iframeRef} src={pdfUrl} title="経歴書プレビュー" className="h-[80vh] w-full rounded-lg border border-gray-200" />
    </div>
  );
}
