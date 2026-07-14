import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const careerSummarySchema = z.object({
  careerSummary: z.preprocess(
    emptyToUndefined,
    z.string().max(1000, "経歴概要は1000文字以内で入力してください").optional(),
  ),
  selfPr: z.preprocess(
    emptyToUndefined,
    z.string().max(1000, "自己PRは1000文字以内で入力してください").optional(),
  ),
});

export type CareerSummaryInput = z.infer<typeof careerSummarySchema>;
export type CareerSummaryErrors = Partial<Record<keyof CareerSummaryInput, string>>;
