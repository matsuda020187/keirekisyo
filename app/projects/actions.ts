"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { calculateExperienceYears } from "@/lib/experience-years";
import { PROCESS_FIELDS, projectSchema } from "./schema";

export type ProjectActionState = {
  error?: string;
};

async function requireStaff(): Promise<string> {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || (role !== "GENERAL_STAFF" && role !== "MANAGER")) {
    redirect("/login");
  }
  return employeeId;
}

function parseInput(formData: FormData) {
  const processes = Object.fromEntries(
    PROCESS_FIELDS.map((field) => [field, formData.get(`process_${field}`) === "on"]),
  );

  let roleIds: unknown;
  let skills: unknown;
  try {
    roleIds = JSON.parse(String(formData.get("roleIdsJson") ?? "[]"));
    skills = JSON.parse(String(formData.get("skillsJson") ?? "[]"));
  } catch {
    return null;
  }

  const raw = {
    siteId: formData.get("siteId"),
    projectTitle: formData.get("projectTitle"),
    industry: formData.get("industry"),
    startDate: formData.get("startDate"),
    isOngoing: formData.get("isOngoing") === "on",
    endDate: formData.get("endDate"),
    projectSummary: formData.get("projectSummary"),
    roleIds,
    totalTeamSize: formData.get("totalTeamSize"),
    teamSize: formData.get("teamSize"),
    overview: formData.get("overview"),
    processes,
    skills,
  };

  return projectSchema.safeParse(raw);
}

async function validateSkillVersions(
  skills: { skillId: number; skillVersionId?: number }[],
): Promise<string | null> {
  if (skills.length === 0) return null;
  const skillIds = [...new Set(skills.map((s) => s.skillId))];
  const skillRows = await prisma.skill.findMany({ where: { id: { in: skillIds } } });
  const skillById = new Map(skillRows.map((s) => [s.id, s]));

  for (const row of skills) {
    const skill = skillById.get(row.skillId);
    if (!skill) return "選択されたスキルが見つかりません";
    if (skill.hasVersion && !row.skillVersionId) {
      return `${skill.skillName}はバージョンの選択が必要です`;
    }
    if (!skill.hasVersion && row.skillVersionId) {
      return `${skill.skillName}はバージョン管理なしのスキルです`;
    }
  }
  return null;
}

async function recalcExperienceYears(
  tx: Prisma.TransactionClient,
  employeeId: string,
  actorId: string,
): Promise<void> {
  const projects = await tx.project.findMany({
    where: { employeeId, deletedAt: null },
    select: { startDate: true, endDate: true },
  });
  const experienceYears = calculateExperienceYears(projects, new Date());
  await tx.employee.update({
    where: { employeeId },
    data: { experienceYears, updatedBy: actorId, updatedProgram: "EDT005" },
  });
}

export async function createProject(
  _prevState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const employeeId = await requireStaff();

  const parsed = parseInput(formData);
  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "入力内容の形式が正しくありません" };
  }

  const skillError = await validateSkillVersions(parsed.data.skills);
  if (skillError) return { error: skillError };

  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        employeeId,
        siteId: data.siteId,
        projectTitle: data.projectTitle,
        industry: data.industry ?? null,
        projectSummary: data.projectSummary ?? null,
        startDate: new Date(`${data.startDate}-01`),
        endDate: data.isOngoing || !data.endDate ? null : new Date(`${data.endDate}-01`),
        totalTeamSize: data.totalTeamSize ?? null,
        teamSize: data.teamSize ?? null,
        createdBy: employeeId,
        createdProgram: "EDT005",
        updatedBy: employeeId,
        updatedProgram: "EDT005",
      },
    });

    await tx.projectDetail.create({
      data: {
        projectId: project.id,
        overview: data.overview ?? null,
        ...data.processes,
        createdBy: employeeId,
        createdProgram: "EDT005",
        updatedBy: employeeId,
        updatedProgram: "EDT005",
      },
    });

    for (const roleId of data.roleIds) {
      await tx.projectRoleLink.create({
        data: {
          projectId: project.id,
          projectRoleId: roleId,
          createdBy: employeeId,
          createdProgram: "EDT005",
          updatedBy: employeeId,
          updatedProgram: "EDT005",
        },
      });
    }

    for (const skill of data.skills) {
      await tx.projectSkill.create({
        data: {
          projectId: project.id,
          skillId: skill.skillId,
          skillVersionId: skill.skillVersionId ?? null,
          createdBy: employeeId,
          createdProgram: "EDT005",
          updatedBy: employeeId,
          updatedProgram: "EDT005",
        },
      });
    }

    await recalcExperienceYears(tx, employeeId, employeeId);
  });

  redirect("/projects");
}

export async function updateProject(
  id: number,
  _prevState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const employeeId = await requireStaff();

  const parsed = parseInput(formData);
  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "入力内容の形式が正しくありません" };
  }

  const skillError = await validateSkillVersions(parsed.data.skills);
  if (skillError) return { error: skillError };

  const data = parsed.data;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: {
        siteId: data.siteId,
        projectTitle: data.projectTitle,
        industry: data.industry ?? null,
        projectSummary: data.projectSummary ?? null,
        startDate: new Date(`${data.startDate}-01`),
        endDate: data.isOngoing || !data.endDate ? null : new Date(`${data.endDate}-01`),
        totalTeamSize: data.totalTeamSize ?? null,
        teamSize: data.teamSize ?? null,
        updatedBy: employeeId,
        updatedProgram: "EDT005",
      },
    });

    await tx.projectDetail.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        overview: data.overview ?? null,
        ...data.processes,
        createdBy: employeeId,
        createdProgram: "EDT005",
        updatedBy: employeeId,
        updatedProgram: "EDT005",
      },
      update: {
        overview: data.overview ?? null,
        ...data.processes,
        updatedBy: employeeId,
        updatedProgram: "EDT005",
      },
    });

    await tx.projectRoleLink.updateMany({
      where: { projectId: id, deletedAt: null },
      data: { deletedAt: now, deletedBy: employeeId, deletedProgram: "EDT005" },
    });
    for (const roleId of data.roleIds) {
      await tx.projectRoleLink.create({
        data: {
          projectId: id,
          projectRoleId: roleId,
          createdBy: employeeId,
          createdProgram: "EDT005",
          updatedBy: employeeId,
          updatedProgram: "EDT005",
        },
      });
    }

    await tx.projectSkill.updateMany({
      where: { projectId: id, deletedAt: null },
      data: { deletedAt: now, deletedBy: employeeId, deletedProgram: "EDT005" },
    });
    for (const skill of data.skills) {
      await tx.projectSkill.create({
        data: {
          projectId: id,
          skillId: skill.skillId,
          skillVersionId: skill.skillVersionId ?? null,
          createdBy: employeeId,
          createdProgram: "EDT005",
          updatedBy: employeeId,
          updatedProgram: "EDT005",
        },
      });
    }

    await recalcExperienceYears(tx, employeeId, employeeId);
  });

  redirect("/projects");
}

export async function deleteProject(id: number): Promise<{ error?: string }> {
  const employeeId = await requireStaff();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // 親(project)を論理削除する際は従属する子(project_detail・project_role_link・
    // project_skill)も同一トランザクションで論理削除する(docs/schema.md 一般ルール)。
    await tx.project.update({
      where: { id },
      data: { deletedAt: now, deletedBy: employeeId, deletedProgram: "EDT005" },
    });
    await tx.projectDetail.updateMany({
      where: { projectId: id, deletedAt: null },
      data: { deletedAt: now, deletedBy: employeeId, deletedProgram: "EDT005" },
    });
    await tx.projectRoleLink.updateMany({
      where: { projectId: id, deletedAt: null },
      data: { deletedAt: now, deletedBy: employeeId, deletedProgram: "EDT005" },
    });
    await tx.projectSkill.updateMany({
      where: { projectId: id, deletedAt: null },
      data: { deletedAt: now, deletedBy: employeeId, deletedProgram: "EDT005" },
    });

    await recalcExperienceYears(tx, employeeId, employeeId);
  });

  redirect("/projects");
}
