import { prisma } from "@/lib/prisma";
import { findDepartmentId, type OrganizationUnitRow } from "@/lib/organization-unit";
import { PROCESS_FIELDS } from "@/app/projects/schema";
import type { AccountRole } from "@/generated/prisma/enums";

export const GENDER_LABELS: Record<string, string> = { MALE: "男性", FEMALE: "女性", OTHER: "その他" };
export const SCHOOL_TYPE_LABELS: Record<string, string> = {
  HIGH_SCHOOL: "高校",
  VOCATIONAL_SCHOOL: "専門学校",
  JUNIOR_COLLEGE: "短大",
  UNIVERSITY: "大学",
  GRADUATE_SCHOOL: "大学院",
};
export const GRADUATION_STATUS_LABELS: Record<string, string> = { GRADUATED: "卒業", WITHDRAWN: "中退" };
export const SKILL_LEVEL_LABELS: Record<string, string> = {
  EXPERT: "◎得意",
  PROFICIENT: "○経験あり",
  BASIC: "△基礎知識",
};
export const PROCESS_LABELS: Record<string, string> = {
  researchAnalysis: "調査分析",
  requirementsDefinition: "要件定義",
  basicDesign: "基本設計",
  detailedDesign: "詳細設計",
  development: "製造",
  testing: "テスト",
  operation: "運用",
};

export function formatDate(date: Date | null): string {
  if (!date) return "-";
  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

export function formatMonth(date: Date | null): string {
  if (!date) return "-";
  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
}

// プロジェクト期間はend_date=NULLが「現在」進行中を意味するため専用の表示にする
export function formatProjectEndMonth(date: Date | null): string {
  if (!date) return "現在";
  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
}

export function getActiveProcesses(detail: { [K in (typeof PROCESS_FIELDS)[number]]: boolean | null } | null) {
  if (!detail) return [];
  return PROCESS_FIELDS.filter((field) => detail[field]);
}

// REF003/REF005/PDF出力で共通の経歴書データ取得。
export async function getResumeData(employeeId: string) {
  return prisma.employee.findUniqueOrThrow({
    where: { employeeId },
    include: {
      organizationUnit: true,
      skills: {
        where: { deletedAt: null },
        include: { skill: { include: { skillCategory: true } }, skillVersion: true },
      },
      certifications: {
        where: { deletedAt: null },
        include: { certification: true },
        orderBy: { acquiredDate: "asc" },
      },
      projects: {
        where: { deletedAt: null },
        include: {
          site: true,
          roleLinks: { where: { deletedAt: null }, include: { projectRole: true } },
          detail: true,
          skills: { where: { deletedAt: null }, include: { skill: true, skillVersion: true } },
        },
        orderBy: { startDate: "desc" },
      },
    },
  });
}

export type ResumeData = Awaited<ReturnType<typeof getResumeData>>;

// 認可: 人事・営業/管理職は全員閲覧可。一般社員は本人または同一部署のみ(docs/screens.md REF002参照)
export async function canViewResume(
  viewerEmployeeId: string,
  viewerRole: AccountRole,
  targetEmployeeId: string,
  targetOrganizationUnitId: number | null,
): Promise<boolean> {
  if (targetEmployeeId === viewerEmployeeId) return true;
  if (viewerRole !== "GENERAL_STAFF") return true;

  const units: OrganizationUnitRow[] = await prisma.organizationUnit.findMany({
    where: { deletedAt: null },
  });
  const viewer = await prisma.employee.findUniqueOrThrow({ where: { employeeId: viewerEmployeeId } });
  const viewerDept = findDepartmentId(units, viewer.organizationUnitId);
  const targetDept = findDepartmentId(units, targetOrganizationUnitId);
  return viewerDept !== null && viewerDept === targetDept;
}
