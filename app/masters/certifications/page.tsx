import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { createCertification, deleteCertification, updateCertification } from "./actions";

export default async function CertificationMasterPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const role = session?.user.role;
  if (!employeeId || !role) redirect("/login");
  if (role !== "MANAGER") redirect("/");

  const { edit, error } = await searchParams;
  const editId = edit ? Number(edit) : null;

  const [categories, certifications] = await Promise.all([
    prisma.certificationCategory.findMany({
      where: { deletedAt: null },
      orderBy: { certificationCategoryName: "asc" },
    }),
    prisma.certification.findMany({
      where: { deletedAt: null },
      include: { certificationCategory: true },
      orderBy: { certificationName: "asc" },
    }),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">資格マスタ管理</h1>

      {error && (
        <p className="w-full max-w-lg rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={createCertification} className="flex w-full max-w-lg flex-col gap-2 rounded-lg border border-gray-200 p-4">
        <CategoryFields categories={categories} />
        <input
          name="certificationName"
          maxLength={100}
          required
          placeholder="資格名"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          name="certificationOrganization"
          maxLength={100}
          required
          placeholder="認定団体（例：IPA）"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          className="self-end rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          追加
        </button>
      </form>

      <ul className="flex w-full max-w-lg flex-col gap-2">
        {certifications.map((item) =>
          editId === item.id ? (
            <li key={item.id} className="rounded-lg border border-gray-200 p-3">
              <form
                action={updateCertification.bind(null, item.id)}
                className="flex flex-col gap-2"
              >
                <CategoryFields categories={categories} defaultCategoryId={item.certificationCategoryId} />
                <input
                  name="certificationName"
                  defaultValue={item.certificationName}
                  maxLength={100}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <input
                  name="certificationOrganization"
                  defaultValue={item.certificationOrganization}
                  maxLength={100}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <div className="flex justify-end gap-2">
                  <Link
                    href="/masters/certifications"
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                  >
                    キャンセル
                  </Link>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </form>
            </li>
          ) : (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
            >
              <div>
                <p className="font-medium">{item.certificationName}</p>
                <p className="text-sm text-gray-500">
                  {item.certificationCategory.certificationCategoryName} ／{" "}
                  {item.certificationOrganization}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/masters/certifications?edit=${item.id}`}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                >
                  編集
                </Link>
                <DeleteConfirmButton
                  message={`「${item.certificationName}」を削除してもよろしいですか？`}
                  action={deleteCertification.bind(null, item.id)}
                />
              </div>
            </li>
          ),
        )}
      </ul>
    </main>
  );
}

function CategoryFields({
  categories,
  defaultCategoryId,
}: {
  categories: { id: number; certificationCategoryName: string }[];
  defaultCategoryId?: number;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <select
        name="certificationCategoryId"
        defaultValue={defaultCategoryId ?? ""}
        className="w-full rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="">カテゴリを選択</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.certificationCategoryName}
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
  );
}
