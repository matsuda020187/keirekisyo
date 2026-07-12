"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { OrganizationUnitLevel } from "@/generated/prisma/enums";

const BASE_PATH = "/masters/organization-units";

const CHILD_LEVEL_BY_PARENT_LEVEL: Partial<Record<OrganizationUnitLevel, OrganizationUnitLevel>> = {
  DIVISION: "SECTION",
  SECTION: "GROUP",
};

async function requireManager(): Promise<string> {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");
  return employeeId;
}

function validateName(name: string): string | null {
  if (!name) return "名称を入力してください";
  if (name.length > 100) return "名称は100文字以内で入力してください";
  return null;
}

export async function createDivision(formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const name = String(formData.get("unitName") ?? "").trim();
  const validationError = validateName(name);
  if (validationError) redirect(`${BASE_PATH}?error=${encodeURIComponent(validationError)}`);

  await prisma.organizationUnit.create({
    data: {
      unitName: name,
      unitLevel: "DIVISION",
      parentId: null,
      createdBy: employeeId,
      createdProgram: "MST004",
      updatedBy: employeeId,
      updatedProgram: "MST004",
    },
  });

  redirect(BASE_PATH);
}

export async function createChildUnit(parentId: number, formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const name = String(formData.get("unitName") ?? "").trim();
  const validationError = validateName(name);
  if (validationError) {
    redirect(`${BASE_PATH}?addChild=${parentId}&error=${encodeURIComponent(validationError)}`);
  }

  const parent = await prisma.organizationUnit.findUniqueOrThrow({ where: { id: parentId } });
  const childLevel = CHILD_LEVEL_BY_PARENT_LEVEL[parent.unitLevel];
  if (!childLevel) {
    redirect(`${BASE_PATH}?error=${encodeURIComponent("Grの配下には追加できません")}`);
  }

  await prisma.organizationUnit.create({
    data: {
      unitName: name,
      unitLevel: childLevel,
      parentId,
      createdBy: employeeId,
      createdProgram: "MST004",
      updatedBy: employeeId,
      updatedProgram: "MST004",
    },
  });

  redirect(BASE_PATH);
}

export async function updateUnitName(id: number, formData: FormData): Promise<void> {
  const employeeId = await requireManager();
  const name = String(formData.get("unitName") ?? "").trim();
  const validationError = validateName(name);
  if (validationError) {
    redirect(`${BASE_PATH}?edit=${id}&error=${encodeURIComponent(validationError)}`);
  }

  await prisma.organizationUnit.update({
    where: { id },
    data: { unitName: name, updatedBy: employeeId, updatedProgram: "MST004" },
  });

  redirect(BASE_PATH);
}

export async function deleteOrganizationUnit(id: number): Promise<{ error?: string }> {
  const employeeId = await requireManager();

  const [child, employeeRef] = await Promise.all([
    prisma.organizationUnit.findFirst({ where: { parentId: id, deletedAt: null } }),
    prisma.employee.findFirst({ where: { organizationUnitId: id, deletedAt: null } }),
  ]);
  if (child || employeeRef) return { error: "配下または所属社員が存在するため削除できません" };

  await prisma.organizationUnit.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: employeeId, deletedProgram: "MST004" },
  });

  revalidatePath(BASE_PATH);
  return {};
}
