import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canViewResume, getResumeData } from "@/lib/resume-data";
import { PreviewClient } from "./PreviewClient";

export default async function ResumePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  const viewerEmployeeId = session?.user.employeeId;
  const viewerRole = session?.user.role;
  if (!viewerEmployeeId || !viewerRole) redirect("/login");

  const { employeeId } = await params;
  const { from } = await searchParams;

  const employee = await getResumeData(employeeId);
  if (!(await canViewResume(viewerEmployeeId, viewerRole, employeeId, employee.organizationUnitId))) {
    redirect("/");
  }

  const backHref = from === "mypage" ? "/mypage" : `/careers/${employeeId}`;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">印刷用プレビュー</h1>
      <PreviewClient
        pdfUrl={`/api/resume-pdf/${employeeId}`}
        employeeId={employeeId}
        backHref={backHref}
      />
    </main>
  );
}
