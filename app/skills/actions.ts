"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { skillsSchema } from "./schema";

export type SkillsActionState = {
  error?: string;
};

export async function saveSkills(
  _prevState: SkillsActionState,
  formData: FormData,
): Promise<SkillsActionState> {
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

  const parsed = skillsSchema.safeParse({ rows: rowsRaw });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  }

  const skillIds = [...new Set(parsed.data.rows.map((row) => row.skillId))];
  const skills = await prisma.skill.findMany({ where: { id: { in: skillIds } } });
  const skillById = new Map(skills.map((s) => [s.id, s]));

  for (const row of parsed.data.rows) {
    const skill = skillById.get(row.skillId);
    if (!skill) return { error: "選択されたスキルが見つかりません" };
    if (skill.hasVersion && !row.skillVersionId) {
      return { error: `${skill.skillName}はバージョンの選択が必要です` };
    }
    if (!skill.hasVersion && row.skillVersionId) {
      return { error: `${skill.skillName}はバージョン管理なしのスキルです` };
    }
  }

  const now = new Date();

  // 明細行は保存時に確定する方式(EDT003/EDT004共通)。
  // 既存のスキルを論理削除し、画面の入力内容から作り直す。
  await prisma.$transaction([
    prisma.employeeSkill.updateMany({
      where: { employeeId, deletedAt: null },
      data: { deletedAt: now, deletedBy: employeeId, deletedProgram: "EDT003" },
    }),
    ...parsed.data.rows.map((row) =>
      prisma.employeeSkill.create({
        data: {
          employeeId,
          skillId: row.skillId,
          skillVersionId: row.skillVersionId ?? null,
          skillLevel: row.skillLevel,
          createdBy: employeeId,
          createdProgram: "EDT003",
          updatedBy: employeeId,
          updatedProgram: "EDT003",
        },
      }),
    ),
  ]);

  redirect("/mypage");
}
