"use client";

import { useActionState, useRef, useState } from "react";
import type { SkillsActionState } from "./actions";

type SkillVersion = { id: number; versionName: string };
type Skill = {
  id: number;
  skillName: string;
  skillCategoryId: number;
  hasVersion: boolean;
  versions: SkillVersion[];
};
type Category = { id: number; skillCategoryName: string };

type Row = {
  key: number;
  categoryId: number | null;
  skillId: number | null;
  skillVersionId: number | null;
  skillLevel: string;
};

type Props = {
  action: (prevState: SkillsActionState, formData: FormData) => Promise<SkillsActionState>;
  categories: Category[];
  skills: Skill[];
  initialRows: Row[];
};

const SKILL_LEVEL_OPTIONS = [
  { value: "EXPERT", label: "◎得意" },
  { value: "PROFICIENT", label: "○経験あり" },
  { value: "BASIC", label: "△基礎知識" },
];

const initialActionState: SkillsActionState = {};

export function SkillsForm({ action, categories, skills, initialRows }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const nextKey = useRef(initialRows.length);

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        key: nextKey.current++,
        categoryId: null,
        skillId: null,
        skillVersionId: null,
        skillLevel: "",
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
      skillId: row.skillId,
      skillVersionId: row.skillVersionId ?? undefined,
      skillLevel: row.skillLevel,
    })),
  );

  return (
    <form action={formAction} className="flex w-full max-w-2xl flex-col gap-4">
      <input type="hidden" name="rowsJson" value={rowsJson} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const filteredSkills = row.categoryId
            ? skills.filter((s) => s.skillCategoryId === row.categoryId)
            : skills;
          const selectedSkill = skills.find((s) => s.id === row.skillId);

          return (
            <div key={row.key} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={row.categoryId ?? ""}
                  onChange={(e) =>
                    updateRow(row.key, {
                      categoryId: e.target.value ? Number(e.target.value) : null,
                      skillId: null,
                      skillVersionId: null,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">カテゴリを選択</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.skillCategoryName}
                    </option>
                  ))}
                </select>
                <select
                  value={row.skillId ?? ""}
                  onChange={(e) =>
                    updateRow(row.key, {
                      skillId: e.target.value ? Number(e.target.value) : null,
                      skillVersionId: null,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">スキルを選択</option>
                  {filteredSkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.skillName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSkill?.hasVersion && (
                <select
                  value={row.skillVersionId ?? ""}
                  onChange={(e) =>
                    updateRow(row.key, {
                      skillVersionId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">バージョンを選択</option>
                  {selectedSkill.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.versionName}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={row.skillLevel}
                onChange={(e) => updateRow(row.key, { skillLevel: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">習熟度を選択</option>
                {SKILL_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

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
