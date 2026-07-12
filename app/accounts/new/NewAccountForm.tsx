"use client";

import { useActionState, useState } from "react";
import type { OrganizationDivisionNode } from "@/lib/organization-unit";
import { resolveOrganizationUnitId } from "@/lib/organization-unit";
import type { NewAccountActionState } from "./actions";

type Props = {
  action: (
    prevState: NewAccountActionState,
    formData: FormData,
  ) => Promise<NewAccountActionState>;
  organizationTree: OrganizationDivisionNode[];
};

const ROLE_OPTIONS = [
  { value: "GENERAL_STAFF", label: "一般社員" },
  { value: "HR_SALES", label: "人事・営業" },
  { value: "MANAGER", label: "管理職" },
];

const initialActionState: NewAccountActionState = { errors: {} };

export function NewAccountForm({ action, organizationTree }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);

  const division = organizationTree.find((d) => d.id === divisionId);
  const section = division?.sections.find((s) => s.id === sectionId);
  const organizationUnitId = resolveOrganizationUnitId({ divisionId, sectionId, groupId });

  return (
    <form action={formAction} className="flex w-full max-w-lg flex-col gap-4">
      <input type="hidden" name="organizationUnitId" value={organizationUnitId ?? ""} />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">
          社員ID<span className="ml-1 text-red-600">*</span>
        </span>
        <input
          name="employeeId"
          maxLength={6}
          required
          placeholder="6桁の数字"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {state.errors.employeeId && (
          <span className="text-sm text-red-600">{state.errors.employeeId}</span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">
          メールアドレス<span className="ml-1 text-red-600">*</span>
        </span>
        <input
          type="email"
          name="email"
          required
          placeholder="会社メールアドレス"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {state.errors.email && <span className="text-sm text-red-600">{state.errors.email}</span>}
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">所属部署</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={divisionId ?? ""}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null;
              setDivisionId(value);
              setSectionId(null);
              setGroupId(null);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">事業部を選択</option>
            {organizationTree.map((d) => (
              <option key={d.id} value={d.id}>
                {d.unitName}
              </option>
            ))}
          </select>
          <select
            value={sectionId ?? ""}
            disabled={!division}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null;
              setSectionId(value);
              setGroupId(null);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">なし</option>
            {division?.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.unitName}
              </option>
            ))}
          </select>
          <select
            value={groupId ?? ""}
            disabled={!section}
            onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">なし</option>
            {section?.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.unitName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">
          権限<span className="ml-1 text-red-600">*</span>
        </span>
        <select
          name="role"
          defaultValue=""
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="" disabled>
            選択してください
          </option>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {state.errors.role && <span className="text-sm text-red-600">{state.errors.role}</span>}
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "登録中..." : "登録"}
      </button>
    </form>
  );
}
