import { z } from "zod";
import { AccountRole } from "@/generated/prisma/enums";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalId = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
  z.number().int().positive().optional(),
);

export const editAccountSchema = z.object({
  organizationUnitId: optionalId,
  role: z.preprocess(
    emptyToUndefined,
    z.enum(Object.values(AccountRole), { error: "権限を選択してください" }),
  ),
});

export type EditAccountInput = z.infer<typeof editAccountSchema>;
export type EditAccountErrors = Partial<Record<keyof EditAccountInput, string>>;
