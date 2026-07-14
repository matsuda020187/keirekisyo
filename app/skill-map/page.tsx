import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildHolderLine, filterSkillMapAggregate } from "@/lib/skill-map-data";
import { loadSkillMap } from "@/lib/skill-map-loader";
import { CertificationPanel } from "./CertificationPanel";
import { SkillPanel } from "./SkillPanel";

function heatCellClass(value: number, max: number): string {
  if (value === 0) return "bg-gray-100 text-gray-400";
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.8) return "bg-blue-600 text-white";
  if (ratio >= 0.55) return "bg-blue-500 text-white";
  if (ratio >= 0.3) return "bg-blue-300 text-blue-900";
  return "bg-blue-100 text-blue-800";
}

export default async function SkillMapPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; q?: string }>;
}) {
  const session = await auth();
  const viewerEmployeeId = session?.user.employeeId;
  const viewerRole = session?.user.role;
  if (!viewerEmployeeId || !viewerRole) redirect("/login");

  const { org, q } = await searchParams;
  const selectedOrgId = org ? Number(org) : null;
  const query = q ?? "";

  const { aggregate: rawAggregate, orgRows } = await loadSkillMap({
    selectedOrgId,
    viewerEmployeeId,
    viewerRole,
  });
  const aggregate = filterSkillMapAggregate(rawAggregate, query);
  const { stats, certCategories, skillCategories, heatmap, riskSkills } = aggregate;

  const exportParams = new URLSearchParams();
  if (selectedOrgId) exportParams.set("org", String(selectedOrgId));
  if (query) exportParams.set("q", query);
  const exportQuery = exportParams.toString() ? `?${exportParams.toString()}` : "";

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">スキルマップ／組織ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          組織単位ごとのスキル・資格保有状況を可視化します。保有者名の表示は経歴書の閲覧権限に連動します。
        </p>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <select
          name="org"
          defaultValue={selectedOrgId ?? ""}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">全社</option>
          {orgRows.map((row) => (
            <option key={row.id} value={row.id}>
              {"　".repeat(row.depth)}
              {row.unitName}
            </option>
          ))}
        </select>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="スキル・資格・氏名で検索"
          className="min-w-60 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          集計
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">登録メンバー数</p>
          <p className="text-2xl font-bold">
            {stats.memberCount}
            <span className="ml-1 text-xs font-medium text-gray-500">名</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">登録スキル種類</p>
          <p className="text-2xl font-bold">
            {stats.skillTypeCount}
            <span className="ml-1 text-xs font-medium text-gray-500">種類</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">資格保有件数</p>
          <p className="text-2xl font-bold">
            {stats.certificationCount}
            <span className="ml-1 text-xs font-medium text-gray-500">件</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">⚠ 保有者1名のスキル</p>
          <p className="text-2xl font-bold text-red-600">
            {stats.rareSkillCount}
            <span className="ml-1 text-xs font-medium text-gray-500">件</span>
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">資格別保有者数</h2>
            <p className="text-xs text-gray-500">タブで資格カテゴリを切り替えられます</p>
          </div>
          <a
            href={`/api/skill-map/export/certifications${exportQuery}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800"
          >
            Excel出力
          </a>
        </div>
        {certCategories.length === 0 ? (
          <p className="text-sm text-gray-500">該当データがありません</p>
        ) : (
          <CertificationPanel categories={certCategories} />
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">スキル別保有者数</h2>
            <p className="text-xs text-gray-500">
              カテゴリ内で保有者数の多い順に上位10件を表示し、「すべて表示」で全件展開できます
            </p>
          </div>
          <a
            href={`/api/skill-map/export/skills${exportQuery}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800"
          >
            Excel出力
          </a>
        </div>
        {skillCategories.length === 0 ? (
          <p className="text-sm text-gray-500">該当データがありません</p>
        ) : (
          <SkillPanel categories={skillCategories} />
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold">部署×スキルカテゴリ ヒートマップ</h2>
        <p className="mb-4 text-xs text-gray-500">色が濃いほど保有者(実人数)が多いことを示します</p>
        {heatmap.departments.length === 0 || heatmap.categories.length === 0 ? (
          <p className="text-sm text-gray-500">該当データがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-1.5 text-left text-gray-500"></th>
                  {heatmap.categories.map((category) => (
                    <th key={category.id} className="p-1.5 text-center font-semibold text-gray-500">
                      {category.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.departments.map((department, rowIndex) => (
                  <tr key={department.id}>
                    <th className="whitespace-nowrap p-1.5 text-left font-medium">{department.name}</th>
                    {heatmap.grid[rowIndex].map((value, colIndex) => (
                      <td
                        key={heatmap.categories[colIndex].id}
                        className={`rounded-md p-2.5 text-center font-bold ${heatCellClass(value, heatmap.max)}`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">⚠ 属人化リスク(保有者1名のスキル)</h2>
            <p className="text-xs text-gray-500">対象者の異動・退職で業務が止まる可能性があるスキルの一覧</p>
          </div>
          <a
            href={`/api/skill-map/export/risk${exportQuery}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800"
          >
            Excel出力
          </a>
        </div>
        {riskSkills.length === 0 ? (
          <p className="text-sm text-gray-500">該当データがありません</p>
        ) : (
          <div className="divide-y divide-amber-100">
            {riskSkills.map((risk) => (
              <div key={risk.skillId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-semibold">{risk.skillName}</p>
                  <p className="text-xs text-gray-500">
                    保有者: {buildHolderLine([risk.holder])}
                    {risk.departmentName ? `(${risk.departmentName})` : ""}
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                  1名のみ
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
