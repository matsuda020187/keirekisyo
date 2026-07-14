import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import {
  addSkillVersions,
  deleteSkillVersion,
  toggleSkillVersionActive,
  updateSkillBasics,
} from "../actions";
import { VersionTagsInput } from "../VersionTagsInput";

export default async function SkillEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");

  const { id } = await params;
  const { error } = await searchParams;
  const skillId = Number(id);

  const [categories, skill] = await Promise.all([
    prisma.skillCategory.findMany({
      where: { deletedAt: null },
      orderBy: { skillCategoryName: "asc" },
    }),
    prisma.skill.findUniqueOrThrow({
      where: { id: skillId },
      include: { versions: { where: { deletedAt: null }, orderBy: { versionName: "asc" } } },
    }),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">スキル編集</h1>

      {error && (
        <p className="w-full max-w-lg rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        action={updateSkillBasics.bind(null, skillId)}
        className="flex w-full max-w-lg flex-col gap-2 rounded-lg border border-gray-200 p-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            name="skillCategoryId"
            defaultValue={skill.skillCategoryId}
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
          defaultValue={skill.skillName}
          maxLength={100}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          className="self-end rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          保存
        </button>
      </form>

      <section className="flex w-full max-w-lg flex-col gap-2">
        <h2 className="font-medium">バージョン</h2>
        {skill.versions.length === 0 && (
          <p className="text-sm text-gray-500">バージョン管理なし</p>
        )}
        <ul className="flex flex-col gap-2">
          {skill.versions.map((version) => (
            <li
              key={version.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
            >
              <span>
                {version.versionName}
                {!version.isActive && (
                  <span className="ml-2 text-xs text-gray-400">(非表示)</span>
                )}
              </span>
              <div className="flex gap-2">
                <form action={toggleSkillVersionActive.bind(null, version.id, !version.isActive)}>
                  <button
                    type="submit"
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    {version.isActive ? "非表示にする" : "表示にする"}
                  </button>
                </form>
                <DeleteConfirmButton
                  message={`「${version.versionName}」を削除してもよろしいですか？`}
                  action={deleteSkillVersion.bind(null, version.id)}
                />
              </div>
            </li>
          ))}
        </ul>

        <form
          action={addSkillVersions.bind(null, skillId)}
          className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4"
        >
          <VersionTagsInput name="versions" />
          <button
            type="submit"
            className="self-end rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            バージョンを追加
          </button>
        </form>
      </section>

      <Link href="/masters/skills" className="text-sm text-blue-600 hover:underline">
        一覧に戻る
      </Link>
    </main>
  );
}
