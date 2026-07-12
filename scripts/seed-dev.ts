// 開発環境限定のテストデータ投入スクリプト。
// 実行: npx tsx scripts/seed-dev.ts
// 開発用ダミーログイン(app/login のNODE_ENV!==production限定フォーム)で
// ログインするための user_account / employee を用意する。
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("このスクリプトは開発環境専用です(NODE_ENV=production では実行不可)");
  }

  const division =
    (await prisma.organizationUnit.findFirst({
      where: { unitName: "システム事業部", unitLevel: "DIVISION" },
    })) ??
    (await prisma.organizationUnit.create({
      data: {
        unitName: "システム事業部",
        unitLevel: "DIVISION",
        createdBy: "seed",
        createdProgram: "seed-dev",
        updatedBy: "seed",
        updatedProgram: "seed-dev",
      },
    }));

  const section = await prisma.organizationUnit.findFirst({
    where: { unitName: "開発部", unitLevel: "SECTION", parentId: division.id },
  }) ?? (await prisma.organizationUnit.create({
    data: {
      unitName: "開発部",
      unitLevel: "SECTION",
      parentId: division.id,
      createdBy: "seed",
      createdProgram: "seed-dev",
      updatedBy: "seed",
      updatedProgram: "seed-dev",
    },
  }));

  const generalStaff = await prisma.employee.upsert({
    where: { employeeId: "900001" },
    update: {},
    create: {
      employeeId: "900001",
      organizationUnitId: section.id,
      createdBy: "seed",
      createdProgram: "seed-dev",
      updatedBy: "seed",
      updatedProgram: "seed-dev",
    },
  });
  await prisma.userAccount.upsert({
    where: { email: "dev-staff@example.com" },
    update: {},
    create: {
      employeeId: generalStaff.employeeId,
      email: "dev-staff@example.com",
      role: "GENERAL_STAFF",
      createdBy: "seed",
      createdProgram: "seed-dev",
      updatedBy: "seed",
      updatedProgram: "seed-dev",
    },
  });

  const manager = await prisma.employee.upsert({
    where: { employeeId: "900002" },
    update: {},
    create: {
      employeeId: "900002",
      isRegistered: true,
      name: "開発 管理職",
      nameKana: "カイハツ カンリショク",
      organizationUnitId: section.id,
      createdBy: "seed",
      createdProgram: "seed-dev",
      updatedBy: "seed",
      updatedProgram: "seed-dev",
    },
  });
  await prisma.userAccount.upsert({
    where: { email: "dev-manager@example.com" },
    update: {},
    create: {
      employeeId: manager.employeeId,
      email: "dev-manager@example.com",
      role: "MANAGER",
      createdBy: "seed",
      createdProgram: "seed-dev",
      updatedBy: "seed",
      updatedProgram: "seed-dev",
    },
  });

  console.log("Seed完了:");
  console.log("- dev-staff@example.com (GENERAL_STAFF, 未登録) → EDT001の確認用");
  console.log("- dev-manager@example.com (MANAGER, 登録済み) → マイページ/マスタ管理の確認用");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
