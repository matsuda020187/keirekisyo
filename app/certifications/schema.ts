import { z } from "zod";

const isValidDateString = (value: string) => !Number.isNaN(Date.parse(value));

const rowSchema = z
  .object({
    certificationId: z.number().int().positive({ message: "資格を選択してください" }),
    acquiredDate: z
      .string()
      .min(1, "取得年月日を入力してください")
      .refine(isValidDateString, "取得年月日の形式が正しくありません"),
    expirationDate: z
      .string()
      .optional()
      .refine((v) => !v || isValidDateString(v), "有効期限の形式が正しくありません"),
  })
  .refine((row) => !isValidDateString(row.acquiredDate) || new Date(row.acquiredDate) <= new Date(), {
    message: "取得年月日は本日以前を指定してください",
    path: ["acquiredDate"],
  })
  .refine(
    (row) =>
      !row.expirationDate ||
      !isValidDateString(row.expirationDate) ||
      new Date(row.expirationDate) > new Date(row.acquiredDate),
    {
      message: "有効期限は取得年月日より後の日付を指定してください",
      path: ["expirationDate"],
    },
  );

export const certificationsSchema = z.object({
  rows: z.array(rowSchema),
});

export type CertificationsInput = z.infer<typeof certificationsSchema>;
