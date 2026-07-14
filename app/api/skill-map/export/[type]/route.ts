import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadSkillMap } from "@/lib/skill-map-loader";
import { buildHolderLine, filterSkillMapAggregate } from "@/lib/skill-map-data";

export const runtime = "nodejs";

const EXPORT_TYPES = ["certifications", "skills", "risk"] as const;
type ExportType = (typeof EXPORT_TYPES)[number];

const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF1FD" } },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await auth();
  const viewerEmployeeId = session?.user.employeeId;
  const viewerRole = session?.user.role;
  if (!viewerEmployeeId || !viewerRole) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { type } = await params;
  if (!EXPORT_TYPES.includes(type as ExportType)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const org = searchParams.get("org");
  const q = searchParams.get("q") ?? "";
  const selectedOrgId = org ? Number(org) : null;

  const { aggregate: rawAggregate } = await loadSkillMap({
    selectedOrgId,
    viewerEmployeeId,
    viewerRole,
  });
  const aggregate = filterSkillMapAggregate(rawAggregate, q);

  const workbook = new ExcelJS.Workbook();

  if (type === "certifications") {
    const sheet = workbook.addWorksheet("資格別保有者数");
    sheet.columns = [
      { header: "カテゴリ", key: "category", width: 20 },
      { header: "資格名", key: "name", width: 30 },
      { header: "保有者数", key: "count", width: 10 },
      { header: "保有者名", key: "holders", width: 60 },
    ];
    sheet.getRow(1).eachCell((cell) => {
      cell.style = HEADER_STYLE;
    });
    for (const category of aggregate.certCategories) {
      for (const item of category.items) {
        sheet.addRow({
          category: category.categoryName,
          name: item.name,
          count: item.holders.length,
          holders: buildHolderLine(item.holders),
        });
      }
    }
  } else if (type === "skills") {
    const sheet = workbook.addWorksheet("スキル別保有者数");
    sheet.columns = [
      { header: "カテゴリ", key: "category", width: 20 },
      { header: "スキル名", key: "name", width: 30 },
      { header: "保有者数", key: "count", width: 10 },
      { header: "保有者名", key: "holders", width: 60 },
    ];
    sheet.getRow(1).eachCell((cell) => {
      cell.style = HEADER_STYLE;
    });
    for (const category of aggregate.skillCategories) {
      for (const item of category.items) {
        sheet.addRow({
          category: category.categoryName,
          name: item.name,
          count: item.holders.length,
          holders: buildHolderLine(item.holders),
        });
      }
    }
  } else {
    const sheet = workbook.addWorksheet("属人化リスク");
    sheet.columns = [
      { header: "スキル名", key: "name", width: 30 },
      { header: "カテゴリ", key: "category", width: 20 },
      { header: "保有者", key: "holder", width: 20 },
      { header: "所属部署", key: "department", width: 20 },
    ];
    sheet.getRow(1).eachCell((cell) => {
      cell.style = HEADER_STYLE;
    });
    for (const risk of aggregate.riskSkills) {
      sheet.addRow({
        name: risk.skillName,
        category: risk.categoryName,
        holder: risk.holder.visible ? risk.holder.name : "非公開",
        department: risk.departmentName ?? "-",
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Blob([new Uint8Array(buffer)]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="skillmap-${type}.xlsx"`,
    },
  });
}
