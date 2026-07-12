import { z } from "zod";
import { SkillLevel } from "@/generated/prisma/enums";

const optionalVersionId = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
  z.number().int().positive().optional(),
);

const rowSchema = z.object({
  skillId: z.number().int().positive({ message: "スキルを選択してください" }),
  skillVersionId: optionalVersionId,
  skillLevel: z.enum(Object.values(SkillLevel), { error: "習熟度を選択してください" }),
});

export const skillsSchema = z
  .object({ rows: z.array(rowSchema) })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.rows.forEach((row, index) => {
      const key = `${row.skillId}-${row.skillVersionId ?? "null"}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: "同じスキル(バージョン)が重複しています",
          path: ["rows", index, "skillId"],
        });
      }
      seen.add(key);
    });
  });

export type SkillsInput = z.infer<typeof skillsSchema>;
