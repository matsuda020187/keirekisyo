import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROCESS_FIELDS } from "../schema";
import { createProject } from "../actions";
import { ProjectForm } from "../ProjectForm";

export default async function NewProjectPage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "GENERAL_STAFF" && role !== "MANAGER") redirect("/");

  const [sites, projectRoles, skills] = await Promise.all([
    prisma.site.findMany({ where: { deletedAt: null }, orderBy: { siteName: "asc" } }),
    prisma.projectRole.findMany({ where: { deletedAt: null }, orderBy: { projectRoleName: "asc" } }),
    prisma.skill.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { deletedAt: null, isActive: true } } },
      orderBy: { skillName: "asc" },
    }),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">プロジェクト経歴登録</h1>
      <ProjectForm
        action={createProject}
        sites={sites}
        projectRoles={projectRoles}
        skills={skills}
        initialValues={{
          siteId: null,
          projectTitle: "",
          industry: "",
          startDate: "",
          isOngoing: false,
          endDate: "",
          projectSummary: "",
          roleIds: [],
          totalTeamSize: "",
          teamSize: "",
          overview: "",
          processes: Object.fromEntries(PROCESS_FIELDS.map((f) => [f, false])) as Record<
            (typeof PROCESS_FIELDS)[number],
            boolean
          >,
          skillRows: [],
        }}
      />
    </main>
  );
}
