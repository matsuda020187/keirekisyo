import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { canViewResume, getResumeData } from "@/lib/resume-data";
import { ResumePdfDocument } from "@/lib/resume-pdf-document";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const session = await auth();
  const viewerEmployeeId = session?.user.employeeId;
  const viewerRole = session?.user.role;
  if (!viewerEmployeeId || !viewerRole) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { employeeId } = await params;
  const employee = await getResumeData(employeeId);

  if (!(await canViewResume(viewerEmployeeId, viewerRole, employeeId, employee.organizationUnitId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const buffer = await renderToBuffer(<ResumePdfDocument employee={employee} />);

  return new NextResponse(new Blob([new Uint8Array(buffer)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="resume-${employeeId}.pdf"`,
    },
  });
}
