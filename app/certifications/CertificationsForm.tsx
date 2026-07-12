"use client";

import { useActionState, useRef, useState } from "react";
import type { CertificationsActionState } from "./actions";

type Certification = {
  id: number;
  certificationName: string;
  certificationOrganization: string;
  certificationCategoryId: number;
};
type Category = { id: number; certificationCategoryName: string };

type Row = {
  key: number;
  categoryId: number | null;
  certificationId: number | null;
  acquiredDate: string;
  expirationDate: string;
};

type Props = {
  action: (
    prevState: CertificationsActionState,
    formData: FormData,
  ) => Promise<CertificationsActionState>;
  categories: Category[];
  certifications: Certification[];
  initialRows: Row[];
};

const initialActionState: CertificationsActionState = {};

export function CertificationsForm({ action, categories, certifications, initialRows }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const nextKey = useRef(initialRows.length);

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        key: nextKey.current++,
        categoryId: null,
        certificationId: null,
        acquiredDate: "",
        expirationDate: "",
      },
    ]);
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((row) => row.key !== key));
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  const rowsJson = JSON.stringify(
    rows.map((row) => ({
      certificationId: row.certificationId,
      acquiredDate: row.acquiredDate,
      expirationDate: row.expirationDate || undefined,
    })),
  );

  return (
    <form action={formAction} className="flex w-full max-w-2xl flex-col gap-4">
      <input type="hidden" name="rowsJson" value={rowsJson} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const filteredCertifications = row.categoryId
            ? certifications.filter((c) => c.certificationCategoryId === row.categoryId)
            : certifications;
          const selectedCertification = certifications.find((c) => c.id === row.certificationId);

          return (
            <div key={row.key} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={row.categoryId ?? ""}
                  onChange={(e) =>
                    updateRow(row.key, {
                      categoryId: e.target.value ? Number(e.target.value) : null,
                      certificationId: null,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">カテゴリで絞込み</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.certificationCategoryName}
                    </option>
                  ))}
                </select>
                <select
                  value={row.certificationId ?? ""}
                  onChange={(e) =>
                    updateRow(row.key, {
                      certificationId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">資格を選択</option>
                  {filteredCertifications.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.certificationName}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-sm text-gray-500">
                認定団体: {selectedCertification?.certificationOrganization ?? "-"}
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="flex w-full flex-col gap-1">
                  <span className="text-xs text-gray-500">取得年月日</span>
                  <input
                    type="date"
                    value={row.acquiredDate}
                    onChange={(e) => updateRow(row.key, { acquiredDate: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="flex w-full flex-col gap-1">
                  <span className="text-xs text-gray-500">有効期限(任意)</span>
                  <input
                    type="date"
                    value={row.expirationDate}
                    onChange={(e) => updateRow(row.key, { expirationDate: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="self-start rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
              >
                この行を削除
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="self-start rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
      >
        行を追加
      </button>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
