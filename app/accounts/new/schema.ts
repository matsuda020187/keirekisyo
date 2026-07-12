import { z } from "zod";
import { AccountRole } from "@/generated/prisma/enums";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalId = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
  z.number().int().positive().optional(),
);

export const newAccountSchema = z.object({
  employeeId: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "社員IDは6桁の数字で入力してください"),
  email: z.string().trim().min(1, "メールアドレスを入力してください").email("メールアドレスの形式が正しくありません"),
  organizationUnitId: optionalId,
  role: z.preprocess(
    emptyToUndefined,
    z.enum(Object.values(AccountRole), { error: "権限を選択してください" }),
  ),
});

export type NewAccountInput = z.infer<typeof newAccountSchema>;
export type NewAccountErrors = Partial<Record<keyof NewAccountInput, string>>;
