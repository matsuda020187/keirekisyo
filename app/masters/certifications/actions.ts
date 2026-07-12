"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/prisma-errors";

const BASE_PATH = "/masters/certifications";

async function requireManager(): Promise<string> {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");
  return employeeId;
}

function redirectWithError(message: string, editId?: number): never {
  const query = editId
    ? `?edit=${editId}&error=${encodeURIComponent(message)}`
    : `?error=${encodeURIComponent(message)}`;
  redirect(`${BASE_PATH}${query}`);
}

async function resolveCategoryId(
  formData: FormData,
  employeeId: string,
  editId?: number,
): Promise<number> {
  const newCategoryName = String(formData.get("newCategoryName") ?? "").trim();
  if (newCategoryName) {
    if (newCategoryName.length > 100) {
      redirectWithError("カテゴリ名は100文字以内で入力してください", editId);
    }
    const category = await prisma.certificationCategory.create({
      data: {
        certificationCategoryName: newCategoryName,
        createdBy: employeeId,
        createdProgram: "MST002",
        updatedBy: employeeId,
        updatedProgram: "MST002",
      },
    });
    return category.id;
  }

  const existing = formData.get("certificationCategoryId");
  const existingId = existing ? Number(existing) : null;
  if (!existingId) redirectWithError("カテゴリを選択または入力してください", editId);
  return existingId;
}

function validateFields(name: string, organization: string, editId?: number): void {
  if (!name) redirectWithError("資格名を入力してください", editId);
  if (name.length > 100) redirectWithError("資格名は100文字以内で入力してください", editId);
  if (!organization) redirectWithError("認定団体を入力してください", editId);
  if (organization.length > 100) {
    redirectWithError("認定団体は100文字以内で入力してください", editId);
  }
}

export async function createCertification(formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const name = String(formData.get("certificationName") ?? "").trim();
  const organization = String(formData.get("certificationOrganization") ?? "").trim();
  validateFields(name, organization);

  const categoryId = await resolveCategoryId(formData, employeeId);

  try {
    await prisma.certification.create({
      data: {
        certificationCategoryId: categoryId,
        certificationName: name,
        certificationOrganization: organization,
        createdBy: employeeId,
        createdProgram: "MST002",
        updatedBy: employeeId,
        updatedProgram: "MST002",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirectWithError("この資格名は既に使用されています");
    }
    throw error;
  }

  redirect(BASE_PATH);
}

export async function updateCertification(id: number, formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const name = String(formData.get("certificationName") ?? "").trim();
  const organization = String(formData.get("certificationOrganization") ?? "").trim();
  validateFields(name, organization, id);

  const categoryId = await resolveCategoryId(formData, employeeId, id);

  try {
    await prisma.certification.update({
      where: { id },
      data: {
        certificationCategoryId: categoryId,
        certificationName: name,
        certificationOrganization: organization,
        updatedBy: employeeId,
        updatedProgram: "MST002",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirectWithError("この資格名は既に使用されています", id);
    }
    throw error;
  }

  redirect(BASE_PATH);
}

export async function deleteCertification(id: number): Promise<{ error?: string }> {
  const employeeId = await requireManager();

  const referenced = await prisma.employeeCertification.findFirst({
    where: { certificationId: id, deletedAt: null },
  });
  if (referenced) return { error: "使用中のため削除できません" };

  await prisma.certification.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: employeeId, deletedProgram: "MST002" },
  });

  revalidatePath(BASE_PATH);
  return {};
}
