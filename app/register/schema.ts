import { z } from "zod";
import { FinalSchoolType, Gender, GraduationStatus } from "@/generated/prisma/enums";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
const optionalId = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
  z.number().int().positive().optional(),
);

// 全角カタカナ(長音符ー含む)のみ許可。カナ入力の文字種チェック(EDT001)。
const KANA_PATTERN = /^[゠-ヿ]+$/u;

export const basicInfoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "氏名を入力してください")
    .max(50, "氏名は50文字以内で入力してください"),
  nameKana: z
    .string()
    .trim()
    .min(1, "カナを入力してください")
    .max(50, "カナは50文字以内で入力してください")
    .regex(KANA_PATTERN, "カナは全角カタカナで入力してください"),
  birthDate: z
    .string()
    .min(1, "生年月日を入力してください")
    .refine((value) => !Number.isNaN(Date.parse(value)), "生年月日の形式が正しくありません"),
  gender: z.preprocess(emptyToUndefined, z.enum(Object.values(Gender)).optional()),
  organizationUnitId: optionalId,
  nearestStationLine: optionalText(100),
  nearestStationName: optionalText(100),
  finalSchoolType: z.preprocess(emptyToUndefined, z.enum(Object.values(FinalSchoolType)).optional()),
  finalSchoolName: optionalText(100),
  finalDepartmentName: optionalText(100),
  graduationStatus: z.preprocess(emptyToUndefined, z.enum(Object.values(GraduationStatus)).optional()),
  graduationYearMonth: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}$/, "卒業年月の形式が正しくありません")
      .optional(),
  ),
});

export type BasicInfoInput = z.infer<typeof basicInfoSchema>;
export type BasicInfoErrors = Partial<Record<keyof BasicInfoInput, string>>;
