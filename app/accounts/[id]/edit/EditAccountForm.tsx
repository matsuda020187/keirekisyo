"use client";

import { useActionState, useState } from "react";
import type { OrganizationDivisionNode, OrganizationSelection } from "@/lib/organization-unit";
import { resolveOrganizationUnitId } from "@/lib/organization-unit";
import type { EditAccountActionState } from "./actions";

type Props = {
  action: (
    prevState: EditAccountActionState,
    formData: FormData,
  ) => Promise<EditAccountActionState>;
  organizationTree: OrganizationDivisionNode[];
  initialSelection: OrganizationSelection;
  initialRole: string;
};

const ROLE_OPTIONS = [
  { value: "GENERAL_STAFF", label: "一般社員" },
  { value: "HR_SALES", label: "人事・営業" },
  { value: "MANAGER", label: "管理職" },
];

const initialActionState: EditAccountActionState = { errors: {} };

export function EditAccountForm({ action, organizationTree, initialSelection, initialRole }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const [divisionId, setDivisionId] = useState(initialSelection.divisionId);
  const [sectionId, setSectionId] = useState(initialSelection.sectionId);
  const [groupId, setGroupId] = useState(initialSelection.groupId);

  const division = organizationTree.find((d) => d.id === divisionId);
  const section = division?.sections.find((s) => s.id === sectionId);
  const organizationUnitId = resolveOrganizationUnitId({ divisionId, sectionId, groupId });

  return (
    <form action={formAction} className="flex w-full max-w-lg flex-col gap-4">
      <input type="hidden" name="organizationUnitId" value={organizationUnitId ?? ""} />

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
          defaultValue={initialRole}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
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
        {isPending ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
