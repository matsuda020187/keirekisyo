import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { PROCESS_FIELDS } from "../../schema";
import { deleteProject, updateProject } from "../../actions";
import { ProjectForm } from "../../ProjectForm";

function toMonthInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 7) : "";
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "GENERAL_STAFF" && role !== "MANAGER") redirect("/");

  const { id } = await params;
  const projectId = Number(id);

  const [sites, projectRoles, skills, project] = await Promise.all([
    prisma.site.findMany({ where: { deletedAt: null }, orderBy: { siteName: "asc" } }),
    prisma.projectRole.findMany({ where: { deletedAt: null }, orderBy: { projectRoleName: "asc" } }),
    prisma.skill.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { deletedAt: null, isActive: true } } },
      orderBy: { skillName: "asc" },
    }),
    prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        detail: true,
        roleLinks: { where: { deletedAt: null } },
        skills: { where: { deletedAt: null } },
      },
    }),
  ]);

  // 本人のプロジェクト経歴のみ編集可能(他人のidを直接指定した編集を防ぐ)
  if (project.employeeId !== employeeId) redirect("/projects");

  const processes = Object.fromEntries(
    PROCESS_FIELDS.map((field) => [field, Boolean(project.detail?.[field])]),
  ) as Record<(typeof PROCESS_FIELDS)[number], boolean>;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">プロジェクト経歴編集</h1>

      <ProjectForm
        action={updateProject.bind(null, projectId)}
        sites={sites}
        projectRoles={projectRoles}
        skills={skills}
        initialValues={{
          siteId: project.siteId,
          projectTitle: project.projectTitle,
          industry: project.industry ?? "",
          startDate: toMonthInputValue(project.startDate),
          isOngoing: project.endDate === null,
          endDate: toMonthInputValue(project.endDate),
          projectSummary: project.projectSummary ?? "",
          roleIds: project.roleLinks.map((link) => link.projectRoleId),
          totalTeamSize: project.totalTeamSize ?? "",
          teamSize: project.teamSize ?? "",
          overview: project.detail?.overview ?? "",
          processes,
          skillRows: project.skills.map((s, index) => ({
            key: index,
            skillId: s.skillId,
            skillVersionId: s.skillVersionId,
          })),
        }}
      />

      <div className="flex w-full max-w-2xl justify-start">
        <DeleteConfirmButton
          message={`「${project.projectTitle}」を削除してもよろしいですか？`}
          action={deleteProject.bind(null, projectId)}
        />
      </div>
    </main>
  );
}
