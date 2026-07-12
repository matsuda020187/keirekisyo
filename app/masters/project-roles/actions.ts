"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/prisma-errors";

const BASE_PATH = "/masters/project-roles";

async function requireManager(): Promise<string> {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");
  return employeeId;
}

function validateName(name: string): string | null {
  if (!name) return "役割名を入力してください";
  if (name.length > 20) return "役割名は20文字以内で入力してください";
  return null;
}

export async function createProjectRole(formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const name = String(formData.get("projectRoleName") ?? "").trim();

  const validationError = validateName(name);
  if (validationError) redirect(`${BASE_PATH}?error=${encodeURIComponent(validationError)}`);

  try {
    await prisma.projectRole.create({
      data: {
        projectRoleName: name,
        createdBy: employeeId,
        createdProgram: "MST003",
        updatedBy: employeeId,
        updatedProgram: "MST003",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect(`${BASE_PATH}?error=${encodeURIComponent("この役割名は既に使用されています")}`);
    }
    throw error;
  }

  redirect(BASE_PATH);
}

export async function updateProjectRole(id: number, formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const name = String(formData.get("projectRoleName") ?? "").trim();

  const validationError = validateName(name);
  if (validationError) {
    redirect(`${BASE_PATH}?edit=${id}&error=${encodeURIComponent(validationError)}`);
  }

  try {
    await prisma.projectRole.update({
      where: { id },
      data: { projectRoleName: name, updatedBy: employeeId, updatedProgram: "MST003" },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect(
        `${BASE_PATH}?edit=${id}&error=${encodeURIComponent("この役割名は既に使用されています")}`,
      );
    }
    throw error;
  }

  redirect(BASE_PATH);
}

export async function deleteProjectRole(id: number): Promise<{ error?: string }> {
  const employeeId = await requireManager();

  const referenced = await prisma.projectRoleLink.findFirst({
    where: { projectRoleId: id, deletedAt: null },
  });
  if (referenced) return { error: "使用中のため削除できません" };

  await prisma.projectRole.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: employeeId, deletedProgram: "MST003" },
  });

  revalidatePath(BASE_PATH);
  return {};
}
