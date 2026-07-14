"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/prisma-errors";

const BASE_PATH = "/masters/sites";

async function requireManager(): Promise<string> {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");
  return employeeId;
}

function validateName(name: string): string | null {
  if (!name) return "現場名を入力してください";
  if (name.length > 100) return "現場名は100文字以内で入力してください";
  return null;
}

export async function createSite(formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const name = String(formData.get("siteName") ?? "").trim();

  const validationError = validateName(name);
  if (validationError) redirect(`${BASE_PATH}?error=${encodeURIComponent(validationError)}`);

  try {
    await prisma.site.create({
      data: {
        siteName: name,
        createdBy: employeeId,
        createdProgram: "MST005",
        updatedBy: employeeId,
        updatedProgram: "MST005",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect(`${BASE_PATH}?error=${encodeURIComponent("この現場名は既に使用されています")}`);
    }
    throw error;
  }

  redirect(BASE_PATH);
}

export async function updateSite(id: number, formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const name = String(formData.get("siteName") ?? "").trim();

  const validationError = validateName(name);
  if (validationError) {
    redirect(`${BASE_PATH}?edit=${id}&error=${encodeURIComponent(validationError)}`);
  }

  try {
    await prisma.site.update({
      where: { id },
      data: { siteName: name, updatedBy: employeeId, updatedProgram: "MST005" },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect(
        `${BASE_PATH}?edit=${id}&error=${encodeURIComponent("この現場名は既に使用されています")}`,
      );
    }
    throw error;
  }

  redirect(BASE_PATH);
}

export async function deleteSite(id: number): Promise<{ error?: string }> {
  const employeeId = await requireManager();

  const referenced = await prisma.project.findFirst({
    where: { siteId: id, deletedAt: null },
  });
  if (referenced) return { error: "使用中のため削除できません" };

  await prisma.site.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: employeeId, deletedProgram: "MST005" },
  });

  revalidatePath(BASE_PATH);
  return {};
}
