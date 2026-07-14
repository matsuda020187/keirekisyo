"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { certificationsSchema } from "./schema";

export type CertificationsActionState = {
  error?: string;
};

export async function saveCertifications(
  _prevState: CertificationsActionState,
  formData: FormData,
): Promise<CertificationsActionState> {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || (role !== "GENERAL_STAFF" && role !== "MANAGER")) {
    redirect("/login");
  }

  let rowsRaw: unknown;
  try {
    rowsRaw = JSON.parse(String(formData.get("rowsJson") ?? "[]"));
  } catch {
    return { error: "入力内容の形式が正しくありません" };
  }

  const parsed = certificationsSchema.safeParse({ rows: rowsRaw });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  }

  const now = new Date();

  // 明細行は保存時に確定する方式(EDT003/EDT004共通)。
  // 既存の資格を論理削除し、画面の入力内容から作り直す(再取得は別レコードとして追加される)。
  await prisma.$transaction([
    prisma.employeeCertification.updateMany({
      where: { employeeId, deletedAt: null },
      data: { deletedAt: now, deletedBy: employeeId, deletedProgram: "EDT004" },
    }),
    ...parsed.data.rows.map((row) =>
      prisma.employeeCertification.create({
        data: {
          employeeId,
          certificationId: row.certificationId,
          acquiredDate: new Date(row.acquiredDate),
          expirationDate: row.expirationDate ? new Date(row.expirationDate) : null,
          createdBy: employeeId,
          createdProgram: "EDT004",
          updatedBy: employeeId,
          updatedProgram: "EDT004",
        },
      }),
    ),
  ]);

  redirect("/mypage");
}
