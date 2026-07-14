import { z } from "zod";

// disabled化されたinput(例: 「現在」チェック時のendDate)はFormDataに含まれずnullになるため、
// 空文字列と合わせてundefinedへ正規化する。
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);
const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
const yearMonth = (message: string) =>
  z.string().regex(/^\d{4}-\d{2}$/, message);

export const PROCESS_FIELDS = [
  "researchAnalysis",
  "requirementsDefinition",
  "basicDesign",
  "detailedDesign",
  "development",
  "testing",
  "operation",
] as const;

const skillRowSchema = z.object({
  skillId: z.number().int().positive(),
  skillVersionId: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
    z.number().int().positive().optional(),
  ),
});

export const projectSchema = z
  .object({
    siteId: z.preprocess(
      (value) => (value === "" || value === undefined ? undefined : Number(value)),
      z.number().int().positive({ message: "現場名を選択してください" }),
    ),
    projectTitle: z
      .string()
      .trim()
      .min(1, "プロジェクトタイトルを入力してください")
      .max(100, "プロジェクトタイトルは100文字以内で入力してください"),
    industry: optionalText(100),
    startDate: yearMonth("開始年月の形式が正しくありません").min(1, "開始年月を入力してください"),
    isOngoing: z.boolean(),
    endDate: z.preprocess(emptyToUndefined, yearMonth("終了年月の形式が正しくありません").optional()),
    projectSummary: optionalText(300),
    roleIds: z.array(z.number().int().positive()).min(1, "役割を1つ以上選択してください"),
    totalTeamSize: optionalText(20),
    teamSize: optionalText(20),
    overview: optionalText(300),
    processes: z.object(
      Object.fromEntries(PROCESS_FIELDS.map((field) => [field, z.boolean()])) as Record<
        (typeof PROCESS_FIELDS)[number],
        z.ZodBoolean
      >,
    ),
    skills: z.array(skillRowSchema),
  })
  .refine((data) => data.isOngoing || !data.endDate || data.endDate >= data.startDate, {
    message: "終了年月は開始年月以降を指定してください",
    path: ["endDate"],
  });

export type ProjectInput = z.infer<typeof projectSchema>;
