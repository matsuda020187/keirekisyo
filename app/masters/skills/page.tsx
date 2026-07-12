import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { createSkill, deleteSkill } from "./actions";
import { VersionTagsInput } from "./VersionTagsInput";

export default async function SkillMasterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");

  const { error } = await searchParams;

  const [categories, skills] = await Promise.all([
    prisma.skillCategory.findMany({
      where: { deletedAt: null },
      orderBy: { skillCategoryName: "asc" },
    }),
    prisma.skill.findMany({
      where: { deletedAt: null },
      include: {
        skillCategory: true,
        versions: { where: { deletedAt: null, isActive: true } },
      },
      orderBy: { skillName: "asc" },
    }),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">スキルマスタ管理</h1>

      {error && (
        <p className="w-full max-w-lg rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        action={createSkill}
        className="flex w-full max-w-lg flex-col gap-2 rounded-lg border border-gray-200 p-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            name="skillCategoryId"
            defaultValue=""
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">カテゴリを選択</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.skillCategoryName}
              </option>
            ))}
          </select>
          <input
            name="newCategoryName"
            maxLength={100}
            placeholder="または新規カテゴリ名"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <input
          name="skillName"
          maxLength={100}
          required
          placeholder="スキル名"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <VersionTagsInput name="versions" />
        <button
          type="submit"
          className="self-end rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          追加
        </button>
      </form>

      <ul className="flex w-full max-w-lg flex-col gap-2">
        {skills.map((skill) => (
          <li
            key={skill.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
          >
            <div>
              <p className="font-medium">{skill.skillName}</p>
              <p className="text-sm text-gray-500">
                {skill.skillCategory.skillCategoryName} ／{" "}
                {skill.versions.length > 0
                  ? skill.versions.map((v) => v.versionName).join(", ")
                  : "バージョン管理なし"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/masters/skills/${skill.id}`}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              >
                編集
              </Link>
              <DeleteConfirmButton
                message={`「${skill.skillName}」を削除してもよろしいですか？`}
                action={deleteSkill.bind(null, skill.id)}
              />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
