"use client";

import { useActionState, useRef, useState } from "react";
import { PROCESS_FIELDS } from "./schema";
import type { ProjectActionState } from "./actions";

type Site = { id: number; siteName: string };
type ProjectRole = { id: number; projectRoleName: string };
type SkillVersion = { id: number; versionName: string };
type Skill = { id: number; skillName: string; hasVersion: boolean; versions: SkillVersion[] };

type SkillRow = { key: number; skillId: number | null; skillVersionId: number | null };

const PROCESS_LABELS: Record<(typeof PROCESS_FIELDS)[number], string> = {
  researchAnalysis: "調査分析",
  requirementsDefinition: "要件定義",
  basicDesign: "基本設計",
  detailedDesign: "詳細設計",
  development: "製造",
  testing: "テスト",
  operation: "運用",
};

type Props = {
  action: (prevState: ProjectActionState, formData: FormData) => Promise<ProjectActionState>;
  sites: Site[];
  projectRoles: ProjectRole[];
  skills: Skill[];
  initialValues: {
    siteId: number | null;
    projectTitle: string;
    industry: string;
    startDate: string;
    isOngoing: boolean;
    endDate: string;
    projectSummary: string;
    roleIds: number[];
    totalTeamSize: string;
    teamSize: string;
    overview: string;
    processes: Record<(typeof PROCESS_FIELDS)[number], boolean>;
    skillRows: SkillRow[];
  };
};

const initialActionState: ProjectActionState = {};

export function ProjectForm({ action, sites, projectRoles, skills, initialValues }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const [roleIds, setRoleIds] = useState<number[]>(initialValues.roleIds);
  const [isOngoing, setIsOngoing] = useState(initialValues.isOngoing);
  const [processes, setProcesses] = useState(initialValues.processes);
  const [skillRows, setSkillRows] = useState<SkillRow[]>(initialValues.skillRows);
  const nextKey = useRef(initialValues.skillRows.length);

  function toggleRole(id: number) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function toggleProcess(field: (typeof PROCESS_FIELDS)[number]) {
    setProcesses((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function addSkillRow() {
    setSkillRows((prev) => [...prev, { key: nextKey.current++, skillId: null, skillVersionId: null }]);
  }

  function removeSkillRow(key: number) {
    setSkillRows((prev) => prev.filter((row) => row.key !== key));
  }

  function updateSkillRow(key: number, patch: Partial<SkillRow>) {
    setSkillRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  const skillsJson = JSON.stringify(
    skillRows
      .filter((row) => row.skillId !== null)
      .map((row) => ({
        skillId: row.skillId,
        skillVersionId: row.skillVersionId ?? undefined,
      })),
  );

  return (
    <form action={formAction} className="flex w-full max-w-2xl flex-col gap-4">
      <input type="hidden" name="roleIdsJson" value={JSON.stringify(roleIds)} />
      <input type="hidden" name="skillsJson" value={skillsJson} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">
          現場名<span className="ml-1 text-red-600">*</span>
        </span>
        <select
          name="siteId"
          defaultValue={initialValues.siteId ?? ""}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">選択してください</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.siteName}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">
          プロジェクトタイトル<span className="ml-1 text-red-600">*</span>
        </span>
        <input
          name="projectTitle"
          defaultValue={initialValues.projectTitle}
          maxLength={100}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">業種</span>
        <input
          name="industry"
          defaultValue={initialValues.industry}
          maxLength={100}
          placeholder="例：金融派生商品"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex w-full flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            開始年月<span className="ml-1 text-red-600">*</span>
          </span>
          <input
            type="month"
            name="startDate"
            defaultValue={initialValues.startDate}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex w-full flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">終了年月</span>
          <input
            type="month"
            name="endDate"
            defaultValue={initialValues.endDate}
            disabled={isOngoing}
            className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isOngoing"
          checked={isOngoing}
          onChange={(e) => setIsOngoing(e.target.checked)}
        />
        現在
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">プロジェクト概要</span>
        <textarea
          name="projectSummary"
          defaultValue={initialValues.projectSummary}
          maxLength={300}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">
          役割<span className="ml-1 text-red-600">*</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {projectRoles.map((role) => (
            <label
              key={role.id}
              className="cursor-pointer rounded-full border border-gray-300 px-4 py-1 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"
            >
              <input
                type="checkbox"
                checked={roleIds.includes(role.id)}
                onChange={() => toggleRole(role.id)}
                className="sr-only"
              />
              {role.projectRoleName}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex w-full flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">全体人数</span>
          <input
            name="totalTeamSize"
            defaultValue={initialValues.totalTeamSize}
            maxLength={20}
            placeholder="例：約50名"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex w-full flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">チーム人数</span>
          <input
            name="teamSize"
            defaultValue={initialValues.teamSize}
            maxLength={20}
            placeholder="例：5名"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">業務詳細(概要)</span>
        <textarea
          name="overview"
          defaultValue={initialValues.overview}
          maxLength={300}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">担当工程</span>
        <div className="flex flex-wrap gap-2">
          {PROCESS_FIELDS.map((field) => (
            <label
              key={field}
              className="cursor-pointer rounded-full border border-gray-300 px-4 py-1 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"
            >
              <input
                type="checkbox"
                name={`process_${field}`}
                checked={processes[field]}
                onChange={() => toggleProcess(field)}
                className="sr-only"
              />
              {PROCESS_LABELS[field]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">使用スキル</span>
        {skillRows.map((row) => {
          const selectedSkill = skills.find((s) => s.id === row.skillId);
          return (
            <div key={row.key} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center">
              <select
                value={row.skillId ?? ""}
                onChange={(e) =>
                  updateSkillRow(row.key, {
                    skillId: e.target.value ? Number(e.target.value) : null,
                    skillVersionId: null,
                  })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">スキルを選択</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.skillName}
                  </option>
                ))}
              </select>
              {selectedSkill?.hasVersion && (
                <select
                  value={row.skillVersionId ?? ""}
                  onChange={(e) =>
                    updateSkillRow(row.key, {
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
              <button
                type="button"
                onClick={() => removeSkillRow(row.key)}
                className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
              >
                削除
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addSkillRow}
          className="self-start rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          スキルを追加
        </button>
      </div>

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
