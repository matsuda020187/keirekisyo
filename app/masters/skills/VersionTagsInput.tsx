"use client";

import { useState } from "react";

// バージョンのタグ複数入力(MST001)。未入力なら「バージョン管理なし」として登録する。
export function VersionTagsInput({ name }: { name: string }) {
  const [versions, setVersions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  function addVersion() {
    const trimmed = draft.trim();
    if (!trimmed || versions.includes(trimmed)) return;
    setVersions([...versions, trimmed]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {versions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {versions.map((version) => (
            <span
              key={version}
              className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
            >
              {version}
              <button
                type="button"
                onClick={() => setVersions(versions.filter((v) => v !== version))}
                className="text-gray-500 hover:text-red-600"
                aria-label={`${version}を削除`}
              >
                ×
              </button>
              <input type="hidden" name={name} value={version} />
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addVersion();
            }
          }}
          placeholder="バージョンを入力してEnter（例：8, 11, 17）未入力ならバージョン管理なし"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <button
          type="button"
          onClick={addVersion}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          追加
        </button>
      </div>
    </div>
  );
}
