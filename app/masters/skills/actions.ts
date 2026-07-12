"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/prisma-errors";

const LIST_PATH = "/masters/skills";

function editPath(id: number): string {
  return `${LIST_PATH}/${id}`;
}

async function requireManager(): Promise<string> {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");
  return employeeId;
}

function parseVersions(formData: FormData): string[] {
  return formData
    .getAll("versions")
    .map(String)
    .map((v) => v.trim())
    .filter(Boolean);
}

async function resolveCategoryId(
  formData: FormData,
  employeeId: string,
  redirectPath: string,
): Promise<number> {
  const newCategoryName = String(formData.get("newCategoryName") ?? "").trim();
  if (newCategoryName) {
    if (newCategoryName.length > 100) {
      redirect(`${redirectPath}?error=${encodeURIComponent("カテゴリ名は100文字以内で入力してください")}`);
    }
    const category = await prisma.skillCategory.create({
      data: {
        skillCategoryName: newCategoryName,
        createdBy: employeeId,
        createdProgram: "MST001",
        updatedBy: employeeId,
        updatedProgram: "MST001",
      },
    });
    return category.id;
  }

  const existing = formData.get("skillCategoryId");
  const existingId = existing ? Number(existing) : null;
  if (!existingId) {
    redirect(`${redirectPath}?error=${encodeURIComponent("カテゴリを選択または入力してください")}`);
  }
  return existingId;
}

export async function createSkill(formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const name = String(formData.get("skillName") ?? "").trim();
  if (!name) redirect(`${LIST_PATH}?error=${encodeURIComponent("スキル名を入力してください")}`);
  if (name.length > 100) {
    redirect(`${LIST_PATH}?error=${encodeURIComponent("スキル名は100文字以内で入力してください")}`);
  }

  const categoryId = await resolveCategoryId(formData, employeeId, LIST_PATH);
  const versions = parseVersions(formData);

  try {
    await prisma.skill.create({
      data: {
        skillCategoryId: categoryId,
        skillName: name,
        hasVersion: versions.length > 0,
        createdBy: employeeId,
        createdProgram: "MST001",
        updatedBy: employeeId,
        updatedProgram: "MST001",
        versions: versions.length
          ? {
              create: versions.map((versionName) => ({
                versionName,
                displayName: `${name} ${versionName}`,
                createdBy: employeeId,
                createdProgram: "MST001",
                updatedBy: employeeId,
                updatedProgram: "MST001",
              })),
            }
          : undefined,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect(`${LIST_PATH}?error=${encodeURIComponent("このスキル名は既に使用されています")}`);
    }
    throw error;
  }

  redirect(LIST_PATH);
}

export async function updateSkillBasics(id: number, formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const name = String(formData.get("skillName") ?? "").trim();
  const path = editPath(id);
  if (!name) redirect(`${path}?error=${encodeURIComponent("スキル名を入力してください")}`);
  if (name.length > 100) {
    redirect(`${path}?error=${encodeURIComponent("スキル名は100文字以内で入力してください")}`);
  }

  const categoryId = await resolveCategoryId(formData, employeeId, path);

  try {
    await prisma.skill.update({
      where: { id },
      data: {
        skillCategoryId: categoryId,
        skillName: name,
        updatedBy: employeeId,
        updatedProgram: "MST001",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect(`${path}?error=${encodeURIComponent("このスキル名は既に使用されています")}`);
    }
    throw error;
  }

  redirect(path);
}

export async function addSkillVersions(id: number, formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const versions = parseVersions(formData);
  if (versions.length === 0) redirect(editPath(id));

  const skill = await prisma.skill.findUniqueOrThrow({ where: { id } });

  await prisma.$transaction([
    prisma.skill.update({
      where: { id },
      data: { hasVersion: true, updatedBy: employeeId, updatedProgram: "MST001" },
    }),
    ...versions.map((versionName) =>
      prisma.skillVersion.create({
        data: {
          skillId: id,
          versionName,
          displayName: `${skill.skillName} ${versionName}`,
          createdBy: employeeId,
          createdProgram: "MST001",
          updatedBy: employeeId,
          updatedProgram: "MST001",
        },
      }),
    ),
  ]);

  redirect(editPath(id));
}

export async function toggleSkillVersionActive(versionId: number, nextActive: boolean): Promise<void> {
  const employeeId = await requireManager();
  const version = await prisma.skillVersion.update({
    where: { id: versionId },
    data: { isActive: nextActive, updatedBy: employeeId, updatedProgram: "MST001" },
  });
  redirect(editPath(version.skillId));
}

export async function deleteSkillVersion(versionId: number): Promise<{ error?: string }> {
  const employeeId = await requireManager();

  const [employeeRef, projectRef] = await Promise.all([
    prisma.employeeSkill.findFirst({ where: { skillVersionId: versionId, deletedAt: null } }),
    prisma.projectSkill.findFirst({ where: { skillVersionId: versionId, deletedAt: null } }),
  ]);
  if (employeeRef || projectRef) return { error: "使用中のため削除できません" };

  const version = await prisma.skillVersion.update({
    where: { id: versionId },
    data: { deletedAt: new Date(), deletedBy: employeeId, deletedProgram: "MST001" },
  });

  revalidatePath(editPath(version.skillId));
  return {};
}

export async function deleteSkill(id: number): Promise<{ error?: string }> {
  const employeeId = await requireManager();

  const [employeeRef, projectRef] = await Promise.all([
    prisma.employeeSkill.findFirst({ where: { skillId: id, deletedAt: null } }),
    prisma.projectSkill.findFirst({ where: { skillId: id, deletedAt: null } }),
  ]);
  if (employeeRef || projectRef) return { error: "使用中のため削除できません" };

  const now = new Date();
  await prisma.$transaction([
    prisma.skillVersion.updateMany({
      where: { skillId: id, deletedAt: null },
      data: { deletedAt: now, deletedBy: employeeId, deletedProgram: "MST001" },
    }),
    prisma.skill.update({
      where: { id },
      data: { deletedAt: now, deletedBy: employeeId, deletedProgram: "MST001" },
    }),
  ]);

  revalidatePath(LIST_PATH);
  return {};
}
