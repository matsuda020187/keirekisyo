import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  canViewResume,
  formatDate,
  formatMonth,
  formatProjectEndMonth,
  getActiveProcesses,
  getResumeData,
  GENDER_LABELS,
  GRADUATION_STATUS_LABELS,
  PROCESS_LABELS,
  SCHOOL_TYPE_LABELS,
  SKILL_LEVEL_LABELS,
} from "@/lib/resume-data";

export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const session = await auth();
  const viewerEmployeeId = session?.user.employeeId;
  const viewerRole = session?.user.role;
  if (!viewerEmployeeId || !viewerRole) redirect("/login");

  const { employeeId } = await params;
  const employee = await getResumeData(employeeId);

  const isOwnProfile = employeeId === viewerEmployeeId;
  if (!(await canViewResume(viewerEmployeeId, viewerRole, employeeId, employee.organizationUnitId))) {
    redirect("/");
  }

  const skillsByCategory = new Map<string, typeof employee.skills>();
  for (const employeeSkill of employee.skills) {
    const key = employeeSkill.skill.skillCategory.skillCategoryName;
    const list = skillsByCategory.get(key) ?? [];
    list.push(employeeSkill);
    skillsByCategory.set(key, list);
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">経歴書詳細</h1>

      {!isOwnProfile && (
        <div className="flex w-full max-w-2xl justify-start">
          <Link href="/careers" className="text-sm text-blue-600 hover:underline">
            一覧に戻る
          </Link>
        </div>
      )}

      <section className="flex w-full max-w-2xl flex-col gap-1 rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 font-medium">基本情報</h2>
        <p>氏名: {employee.name ?? "-"}({employee.nameKana ?? "-"})</p>
        <p>生年月日: {formatDate(employee.birthDate)}</p>
        <p>性別: {employee.gender ? GENDER_LABELS[employee.gender] : "-"}</p>
        <p>所属組織: {employee.organizationUnit?.unitName ?? "未所属"}</p>
        <p>
          最寄駅: {employee.nearestStationLine ?? "-"} {employee.nearestStationName ?? ""}
        </p>
        <p>経験年数: {employee.experienceYears ?? 0}年</p>
      </section>

      <section className="flex w-full max-w-2xl flex-col gap-1 rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 font-medium">最終学歴</h2>
        <p>学校種別: {employee.finalSchoolType ? SCHOOL_TYPE_LABELS[employee.finalSchoolType] : "-"}</p>
        <p>
          学校名: {employee.finalSchoolName ?? "-"} {employee.finalDepartmentName ?? ""}
        </p>
        <p>卒業年月: {formatMonth(employee.graduationYearMonth)}</p>
        <p>
          卒業状況:{" "}
          {employee.graduationStatus ? GRADUATION_STATUS_LABELS[employee.graduationStatus] : "-"}
        </p>
      </section>

      <section className="w-full max-w-2xl rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 font-medium">経歴概要</h2>
        <p className="whitespace-pre-wrap text-sm">{employee.careerSummary || "未登録"}</p>
      </section>

      <section className="w-full max-w-2xl rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 font-medium">自己PR</h2>
        <p className="whitespace-pre-wrap text-sm">{employee.selfPr || "未登録"}</p>
      </section>

      <section className="w-full max-w-2xl rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 font-medium">スキル一覧</h2>
        {skillsByCategory.size === 0 && <p className="text-sm text-gray-500">未登録</p>}
        {[...skillsByCategory.entries()].map(([category, list]) => (
          <div key={category} className="mb-2">
            <p className="text-sm font-medium text-gray-600">{category}</p>
            <ul className="ml-4 list-disc text-sm">
              {list.map((es) => (
                <li key={es.id}>
                  {es.skill.skillName}
                  {es.skillVersion ? ` ${es.skillVersion.versionName}` : ""} ―{" "}
                  {SKILL_LEVEL_LABELS[es.skillLevel]}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="w-full max-w-2xl rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 font-medium">資格一覧</h2>
        {employee.certifications.length === 0 && <p className="text-sm text-gray-500">未登録</p>}
        <ul className="ml-4 list-disc text-sm">
          {employee.certifications.map((ec) => (
            <li key={ec.id}>
              {formatMonth(ec.acquiredDate)} {ec.certification.certificationName}(
              {ec.certification.certificationOrganization})
            </li>
          ))}
        </ul>
      </section>

      <section className="flex w-full max-w-2xl flex-col gap-3">
        <h2 className="font-medium">プロジェクト経歴</h2>
        {employee.projects.length === 0 && <p className="text-sm text-gray-500">未登録</p>}
        {employee.projects.map((project) => {
          const activeProcesses = getActiveProcesses(project.detail);
          return (
            <div key={project.id} className="rounded-lg border border-gray-200 p-4 text-sm">
              <p className="font-medium">
                {project.site.siteName} ／ {project.projectTitle}
              </p>
              <p className="text-gray-500">
                {formatMonth(project.startDate)} 〜 {formatProjectEndMonth(project.endDate)} ／{" "}
                {project.industry ?? "-"}
              </p>
              <p className="text-gray-500">
                役割: {project.roleLinks.map((link) => link.projectRole.projectRoleName).join("、")}
              </p>
              <p className="text-gray-500">
                規模: {project.totalTeamSize ?? "-"} (チーム: {project.teamSize ?? "-"})
              </p>
              {project.projectSummary && <p className="mt-1">{project.projectSummary}</p>}
              {project.detail?.overview && <p className="mt-1">業務詳細: {project.detail.overview}</p>}
              {activeProcesses.length > 0 && (
                <p className="text-gray-500">
                  担当工程: {activeProcesses.map((field) => PROCESS_LABELS[field]).join("、")}
                </p>
              )}
              {project.skills.length > 0 && (
                <p className="text-gray-500">
                  使用スキル:{" "}
                  {project.skills
                    .map((ps) => `${ps.skill.skillName}${ps.skillVersion ? ` ${ps.skillVersion.versionName}` : ""}`)
                    .join("、")}
                </p>
              )}
            </div>
          );
        })}
      </section>

      <div className="flex w-full max-w-2xl justify-end gap-2">
        <Link
          href={`/careers/${employeeId}/preview`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          PDF出力
        </Link>
        <span className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-400">
          Excel出力(準備中)
        </span>
      </div>
    </main>
  );
}
