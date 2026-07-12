"use client";

import { useActionState, useState } from "react";
import type { CareerSummaryActionState } from "./actions";

const MAX_LENGTH = 1000;

type Props = {
  action: (
    prevState: CareerSummaryActionState,
    formData: FormData,
  ) => Promise<CareerSummaryActionState>;
  initialValues: { careerSummary: string; selfPr: string };
};

const initialActionState: CareerSummaryActionState = { errors: {} };

export function CareerSummaryForm({ action, initialValues }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const [careerSummary, setCareerSummary] = useState(initialValues.careerSummary);
  const [selfPr, setSelfPr] = useState(initialValues.selfPr);

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">経歴概要</span>
        <textarea
          name="careerSummary"
          value={careerSummary}
          onChange={(e) => setCareerSummary(e.target.value)}
          maxLength={MAX_LENGTH}
          rows={6}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <span className="self-end text-xs text-gray-500">
          {careerSummary.length} / {MAX_LENGTH}
        </span>
        {state.errors.careerSummary && (
          <span className="text-sm text-red-600">{state.errors.careerSummary}</span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">自己PR</span>
        <textarea
          name="selfPr"
          value={selfPr}
          onChange={(e) => setSelfPr(e.target.value)}
          maxLength={MAX_LENGTH}
          rows={6}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <span className="self-end text-xs text-gray-500">
          {selfPr.length} / {MAX_LENGTH}
        </span>
        {state.errors.selfPr && <span className="text-sm text-red-600">{state.errors.selfPr}</span>}
      </label>

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
