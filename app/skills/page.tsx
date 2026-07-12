import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveSkills } from "./actions";
import { SkillsForm } from "./SkillsForm";

export default async function SkillsPage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "GENERAL_STAFF" && role !== "MANAGER") redirect("/");

  const [categories, skills, employeeSkills] = await Promise.all([
    prisma.skillCategory.findMany({
      where: { deletedAt: null },
      orderBy: { skillCategoryName: "asc" },
    }),
    prisma.skill.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { deletedAt: null, isActive: true } } },
      orderBy: { skillName: "asc" },
    }),
    prisma.employeeSkill.findMany({
      where: { employeeId, deletedAt: null },
      include: { skill: true },
    }),
  ]);

  const initialRows = employeeSkills.map((es, index) => ({
    key: index,
    categoryId: es.skill.skillCategoryId,
    skillId: es.skillId,
    skillVersionId: es.skillVersionId,
    skillLevel: es.skillLevel,
  }));

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">スキル登録</h1>

      <SkillsForm action={saveSkills} categories={categories} skills={skills} initialRows={initialRows} />
    </main>
  );
}
