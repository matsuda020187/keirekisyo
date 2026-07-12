"use client";

import { useActionState, useState } from "react";
import type { OrganizationDivisionNode, OrganizationSelection } from "@/lib/organization-unit";
import { resolveOrganizationUnitId } from "@/lib/organization-unit";
import type { BasicInfoActionState } from "./actions";

type Props = {
  action: (
    prevState: BasicInfoActionState,
    formData: FormData,
  ) => Promise<BasicInfoActionState>;
  employeeId: string;
  email: string;
  organizationTree: OrganizationDivisionNode[];
  initialSelection: OrganizationSelection;
  initialValues: {
    name: string;
    nameKana: string;
    birthDate: string;
    gender: string;
    nearestStationLine: string;
    nearestStationName: string;
    finalSchoolType: string;
    finalSchoolName: string;
    finalDepartmentName: string;
    graduationStatus: string;
    graduationYearMonth: string;
  };
};

const GENDER_OPTIONS = [
  { value: "MALE", label: "男性" },
  { value: "FEMALE", label: "女性" },
  { value: "OTHER", label: "その他" },
];

const SCHOOL_TYPE_OPTIONS = [
  { value: "HIGH_SCHOOL", label: "高校" },
  { value: "VOCATIONAL_SCHOOL", label: "専門学校" },
  { value: "JUNIOR_COLLEGE", label: "短大" },
  { value: "UNIVERSITY", label: "大学" },
  { value: "GRADUATE_SCHOOL", label: "大学院" },
];

const GRADUATION_STATUS_OPTIONS = [
  { value: "GRADUATED", label: "卒業" },
  { value: "WITHDRAWN", label: "中退" },
];

const initialActionState: BasicInfoActionState = { errors: {} };

export function RegisterForm({
  action,
  employeeId,
  email,
  organizationTree,
  initialSelection,
  initialValues,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const [divisionId, setDivisionId] = useState(initialSelection.divisionId);
  const [sectionId, setSectionId] = useState(initialSelection.sectionId);
  const [groupId, setGroupId] = useState(initialSelection.groupId);

  const division = organizationTree.find((d) => d.id === divisionId);
  const section = division?.sections.find((s) => s.id === sectionId);
  const organizationUnitId = resolveOrganizationUnitId({ divisionId, sectionId, groupId });

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-6">
      <input type="hidden" name="organizationUnitId" value={organizationUnitId ?? ""} />

      <Field label="社員ID">
        <p className="text-gray-700">{employeeId}</p>
      </Field>
      <Field label="メールアドレス">
        <p className="text-gray-700">{email}</p>
      </Field>

      <Field label="氏名" required error={state.errors.name}>
        <input
          name="name"
          defaultValue={initialValues.name}
          maxLength={50}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </Field>

      <Field label="カナ" required error={state.errors.nameKana}>
        <input
          name="nameKana"
          defaultValue={initialValues.nameKana}
          maxLength={50}
          required
          placeholder="ヤマダタロウ"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </Field>

      <Field label="生年月日" required error={state.errors.birthDate}>
        <input
          type="date"
          name="birthDate"
          defaultValue={initialValues.birthDate}
          required
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </Field>

      <Field label="性別" error={state.errors.gender}>
        <PillGroup name="gender" options={GENDER_OPTIONS} defaultValue={initialValues.gender} />
      </Field>

      <Field label="所属組織">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={divisionId ?? ""}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null;
              setDivisionId(value);
              setSectionId(null);
              setGroupId(null);
            }}
            className="rounded-md border border-gray-300 px-3 py-2"
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
            className="rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
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
            className="rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">なし</option>
            {section?.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.unitName}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <Field label="最寄駅">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="nearestStationLine"
            defaultValue={initialValues.nearestStationLine}
            maxLength={100}
            placeholder="路線名（例：JR山手線）"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <input
            name="nearestStationName"
            defaultValue={initialValues.nearestStationName}
            maxLength={100}
            placeholder="駅名（例：渋谷駅）"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </Field>

      <Field label="学校種別" error={state.errors.finalSchoolType}>
        <select
          name="finalSchoolType"
          defaultValue={initialValues.finalSchoolType}
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">選択なし</option>
          {SCHOOL_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="最終学歴">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="finalSchoolName"
            defaultValue={initialValues.finalSchoolName}
            maxLength={100}
            placeholder="学校名"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <input
            name="finalDepartmentName"
            defaultValue={initialValues.finalDepartmentName}
            maxLength={100}
            placeholder="学部・学科名"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </Field>

      <Field label="卒業状況" error={state.errors.graduationStatus}>
        <PillGroup
          name="graduationStatus"
          options={GRADUATION_STATUS_OPTIONS}
          defaultValue={initialValues.graduationStatus}
        />
      </Field>

      <Field label="卒業年月" error={state.errors.graduationYearMonth}>
        <input
          type="month"
          name="graduationYearMonth"
          defaultValue={initialValues.graduationYearMonth}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </Field>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "保存中..." : "保存"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}

function PillGroup({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}) {
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="cursor-pointer rounded-full border border-gray-300 px-4 py-1 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={defaultValue === option.value}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
