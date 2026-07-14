// 開発環境限定のテストデータ投入スクリプト。
// 実行: npx tsx scripts/seed-dev.ts
// 開発用ダミーログイン(app/login のNODE_ENV!==production限定フォーム)で
// ログインするための user_account / employee 一式(組織・スキル・資格・プロジェクト経歴込み)を用意する。
// 何度実行しても安全なよう、名称・メールアドレス等の一意キーで検索してから作成する。
import "dotenv/config";
import { prisma } from "../lib/prisma";
import {
  AccountRole,
  EmploymentStatus,
  OrganizationUnitLevel,
  SkillLevel,
} from "../generated/prisma/enums";

const CREATED_BY = "seed";
const CREATED_PROGRAM = "seed-dev";
const AUDIT_FIELDS = {
  createdBy: CREATED_BY,
  createdProgram: CREATED_PROGRAM,
  updatedBy: CREATED_BY,
  updatedProgram: CREATED_PROGRAM,
};

async function getOrCreateOrgUnit(
  unitName: string,
  unitLevel: OrganizationUnitLevel,
  parentId: number | null,
): Promise<number> {
  const existing = await prisma.organizationUnit.findFirst({
    where: { unitName, unitLevel, parentId, deletedAt: null },
  });
  if (existing) return existing.id;

  const created = await prisma.organizationUnit.create({
    data: { unitName, unitLevel, parentId, ...AUDIT_FIELDS },
  });
  return created.id;
}

async function getOrCreateSkillCategory(name: string): Promise<number> {
  const existing = await prisma.skillCategory.findFirst({
    where: { skillCategoryName: name, deletedAt: null },
  });
  if (existing) return existing.id;

  const created = await prisma.skillCategory.create({
    data: { skillCategoryName: name, ...AUDIT_FIELDS },
  });
  return created.id;
}

async function getOrCreateSkill(
  skillCategoryId: number,
  skillName: string,
  versionNames: string[] = [],
): Promise<{ skillId: number; versionIdByName: Map<string, number> }> {
  let skill = await prisma.skill.findUnique({ where: { skillName } });
  if (!skill) {
    skill = await prisma.skill.create({
      data: {
        skillCategoryId,
        skillName,
        hasVersion: versionNames.length > 0,
        ...AUDIT_FIELDS,
      },
    });
  }

  const versionIdByName = new Map<string, number>();
  for (const versionName of versionNames) {
    const existing = await prisma.skillVersion.findFirst({
      where: { skillId: skill.id, versionName, deletedAt: null },
    });
    const version =
      existing ??
      (await prisma.skillVersion.create({
        data: {
          skillId: skill.id,
          versionName,
          displayName: `${skillName} ${versionName}`,
          ...AUDIT_FIELDS,
        },
      }));
    versionIdByName.set(versionName, version.id);
  }

  return { skillId: skill.id, versionIdByName };
}

async function getOrCreateCertCategory(name: string): Promise<number> {
  const existing = await prisma.certificationCategory.findFirst({
    where: { certificationCategoryName: name, deletedAt: null },
  });
  if (existing) return existing.id;

  const created = await prisma.certificationCategory.create({
    data: { certificationCategoryName: name, ...AUDIT_FIELDS },
  });
  return created.id;
}

async function getOrCreateCertification(
  categoryId: number,
  name: string,
  organization: string,
): Promise<number> {
  const certification = await prisma.certification.upsert({
    where: { certificationName: name },
    update: {},
    create: {
      certificationCategoryId: categoryId,
      certificationName: name,
      certificationOrganization: organization,
      ...AUDIT_FIELDS,
    },
  });
  return certification.id;
}

async function getOrCreateSite(siteName: string): Promise<number> {
  const site = await prisma.site.upsert({
    where: { siteName },
    update: {},
    create: { siteName, ...AUDIT_FIELDS },
  });
  return site.id;
}

async function getOrCreateProjectRole(projectRoleName: string): Promise<number> {
  const role = await prisma.projectRole.upsert({
    where: { projectRoleName },
    update: {},
    create: { projectRoleName, ...AUDIT_FIELDS },
  });
  return role.id;
}

async function upsertEmployee(params: {
  employeeId: string;
  organizationUnitId: number | null;
  isRegistered: boolean;
  employmentStatus: EmploymentStatus;
  name: string | null;
  nameKana: string | null;
}): Promise<void> {
  const { employeeId, organizationUnitId, isRegistered, employmentStatus, name, nameKana } = params;
  await prisma.employee.upsert({
    where: { employeeId },
    update: { organizationUnitId, isRegistered, employmentStatus, name, nameKana },
    create: {
      employeeId,
      organizationUnitId,
      isRegistered,
      employmentStatus,
      name,
      nameKana,
      ...AUDIT_FIELDS,
    },
  });
}

async function upsertUserAccount(params: {
  employeeId: string;
  email: string;
  role: AccountRole;
}): Promise<void> {
  const { employeeId, email, role } = params;
  // email・employee_idの両方がUNIQUEのため、upsert(where: email)だと
  // 「employee_idは既存だがemailは未使用」なケースでUNIQUE制約違反になる。
  // employee_idを主キーとして先に検索し、その行を更新する。
  const existing = await prisma.userAccount.findUnique({ where: { employeeId } });
  if (existing) {
    await prisma.userAccount.update({ where: { employeeId }, data: { email, role } });
    return;
  }
  await prisma.userAccount.create({ data: { employeeId, email, role, ...AUDIT_FIELDS } });
}

async function ensureEmployeeSkill(params: {
  employeeId: string;
  skillId: number;
  skillVersionId: number | null;
  skillLevel: SkillLevel;
}): Promise<void> {
  const { employeeId, skillId, skillVersionId, skillLevel } = params;
  const existing = await prisma.employeeSkill.findFirst({
    where: { employeeId, skillId, skillVersionId, deletedAt: null },
  });
  if (existing) return;

  await prisma.employeeSkill.create({
    data: { employeeId, skillId, skillVersionId, skillLevel, ...AUDIT_FIELDS },
  });
}

async function ensureEmployeeCertification(params: {
  employeeId: string;
  certificationId: number;
  acquiredDate: Date;
}): Promise<void> {
  const { employeeId, certificationId, acquiredDate } = params;
  const existing = await prisma.employeeCertification.findFirst({
    where: { employeeId, certificationId, deletedAt: null },
  });
  if (existing) return;

  await prisma.employeeCertification.create({
    data: { employeeId, certificationId, acquiredDate, ...AUDIT_FIELDS },
  });
}

type ProjectSeed = {
  siteId: number;
  projectTitle: string;
  industry: string;
  startDate: Date;
  endDate: Date | null;
  overview: string;
  roleIds: number[];
  skillIds: number[];
};

async function ensureProject(employeeId: string, seed: ProjectSeed): Promise<void> {
  const existing = await prisma.project.findFirst({
    where: { employeeId, projectTitle: seed.projectTitle, deletedAt: null },
  });
  if (existing) return;

  const project = await prisma.project.create({
    data: {
      employeeId,
      siteId: seed.siteId,
      projectTitle: seed.projectTitle,
      industry: seed.industry,
      startDate: seed.startDate,
      endDate: seed.endDate,
      ...AUDIT_FIELDS,
    },
  });

  await prisma.projectDetail.create({
    data: {
      projectId: project.id,
      overview: seed.overview,
      requirementsDefinition: true,
      basicDesign: true,
      detailedDesign: true,
      development: true,
      testing: true,
      ...AUDIT_FIELDS,
    },
  });

  for (const projectRoleId of seed.roleIds) {
    await prisma.projectRoleLink.create({
      data: { projectId: project.id, projectRoleId, ...AUDIT_FIELDS },
    });
  }

  for (const skillId of seed.skillIds) {
    await prisma.projectSkill.create({
      data: { projectId: project.id, skillId, skillVersionId: null, ...AUDIT_FIELDS },
    });
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("このスクリプトは開発環境専用です(NODE_ENV=production では実行不可)");
  }

  // --- 組織単位 -------------------------------------------------------
  const systemDivisionId = await getOrCreateOrgUnit("システム事業部", OrganizationUnitLevel.DIVISION, null);
  const devSectionId = await getOrCreateOrgUnit("開発部", OrganizationUnitLevel.SECTION, systemDivisionId);
  const devGroup1Id = await getOrCreateOrgUnit("第一開発Gr", OrganizationUnitLevel.GROUP, devSectionId);
  const devGroup2Id = await getOrCreateOrgUnit("第二開発Gr", OrganizationUnitLevel.GROUP, devSectionId);
  const infraSectionId = await getOrCreateOrgUnit("インフラ部", OrganizationUnitLevel.SECTION, systemDivisionId);

  const salesDivisionId = await getOrCreateOrgUnit("営業事業部", OrganizationUnitLevel.DIVISION, null);
  const salesSectionId = await getOrCreateOrgUnit("営業部", OrganizationUnitLevel.SECTION, salesDivisionId);

  const adminDivisionId = await getOrCreateOrgUnit("管理事業部", OrganizationUnitLevel.DIVISION, null);
  const hrSectionId = await getOrCreateOrgUnit("人事部", OrganizationUnitLevel.SECTION, adminDivisionId);

  // --- スキルマスタ -----------------------------------------------------
  const programmingCategoryId = await getOrCreateSkillCategory("プログラミング言語");
  const cloudCategoryId = await getOrCreateSkillCategory("クラウド・インフラ");
  const dbCategoryId = await getOrCreateSkillCategory("データベース");

  const java = await getOrCreateSkill(programmingCategoryId, "Java", ["8", "11", "17"]);
  const typescript = await getOrCreateSkill(programmingCategoryId, "TypeScript");
  const python = await getOrCreateSkill(programmingCategoryId, "Python");
  const cobol = await getOrCreateSkill(programmingCategoryId, "COBOL");

  const aws = await getOrCreateSkill(cloudCategoryId, "AWS");
  const azure = await getOrCreateSkill(cloudCategoryId, "Azure");
  const docker = await getOrCreateSkill(cloudCategoryId, "Docker");
  const kubernetes = await getOrCreateSkill(cloudCategoryId, "Kubernetes");

  const postgresql = await getOrCreateSkill(dbCategoryId, "PostgreSQL");
  const mysql = await getOrCreateSkill(dbCategoryId, "MySQL");

  // --- 資格マスタ(取得資格マップと同じカテゴリ名を使い回す) -----------------
  const itSkillCategoryId = await getOrCreateCertCategory("システム開発");
  const dbCertCategoryId = await getOrCreateCertCategory("データベース");
  const infraCertCategoryId = await getOrCreateCertCategory("インフラ");
  const managementCertCategoryId = await getOrCreateCertCategory("マネジメント");
  const devSkillCertCategoryId = await getOrCreateCertCategory("デベロップメントスキル");

  const fe = await getOrCreateCertification(itSkillCategoryId, "基本情報技術者試験", "IPA（独立行政法人情報処理推進機構）");
  const ap = await getOrCreateCertification(itSkillCategoryId, "応用情報技術者試験", "IPA（独立行政法人情報処理推進機構）");
  const dbSpecialist = await getOrCreateCertification(
    dbCertCategoryId,
    "データベーススペシャリスト試験",
    "IPA（独立行政法人情報処理推進機構）",
  );
  const oracleMasterSilver = await getOrCreateCertification(dbCertCategoryId, "Oracle Master Silver", "Oracle");
  const ccna = await getOrCreateCertification(infraCertCategoryId, "CCNA", "Cisco Systems");
  const awsSaa = await getOrCreateCertification(
    infraCertCategoryId,
    "AWS Certified Solutions Architect - Associate",
    "Amazon Web Services（AWS）",
  );
  const pmp = await getOrCreateCertification(
    managementCertCategoryId,
    "PMP（プロジェクトマネジメント・プロフェッショナル）",
    "PMI（Project Management Institute）",
  );
  const itilFoundation = await getOrCreateCertification(devSkillCertCategoryId, "ITIL Foundation", "PeopleCert");

  // --- 現場・役割マスタ ---------------------------------------------------
  const siteRetailRenewal = await getOrCreateSite("大手流通業様基幹システム刷新プロジェクト");
  const siteBankCore = await getOrCreateSite("地方銀行様勘定系システム更改プロジェクト");
  const siteManufacturingCloud = await getOrCreateSite("製造業様生産管理システムクラウド移行");
  const siteEcNewBuild = await getOrCreateSite("ECサイト新規構築プロジェクト");

  const rolePm = await getOrCreateProjectRole("PM");
  const rolePl = await getOrCreateProjectRole("PL");
  const roleSe = await getOrCreateProjectRole("SE");
  const rolePg = await getOrCreateProjectRole("PG");
  const roleTester = await getOrCreateProjectRole("テスター");

  // --- 社員・アカウント ---------------------------------------------------
  await upsertEmployee({
    employeeId: "900001",
    organizationUnitId: devSectionId,
    isRegistered: false,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: null,
    nameKana: null,
  });
  await upsertUserAccount({ employeeId: "900001", email: "dev-staff@example.com", role: AccountRole.GENERAL_STAFF });

  await upsertEmployee({
    employeeId: "900002",
    organizationUnitId: devSectionId,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "開発 管理職",
    nameKana: "カイハツ カンリショク",
  });
  await upsertUserAccount({ employeeId: "900002", email: "dev-manager@example.com", role: AccountRole.MANAGER });

  await upsertEmployee({
    employeeId: "900003",
    organizationUnitId: devGroup1Id,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "佐藤 太郎",
    nameKana: "サトウ タロウ",
  });
  await upsertUserAccount({ employeeId: "900003", email: "dev-sato@example.com", role: AccountRole.GENERAL_STAFF });
  await ensureEmployeeSkill({
    employeeId: "900003",
    skillId: java.skillId,
    skillVersionId: java.versionIdByName.get("17") ?? null,
    skillLevel: SkillLevel.EXPERT,
  });
  await ensureEmployeeSkill({
    employeeId: "900003",
    skillId: postgresql.skillId,
    skillVersionId: null,
    skillLevel: SkillLevel.PROFICIENT,
  });
  await ensureEmployeeCertification({ employeeId: "900003", certificationId: fe, acquiredDate: new Date("2022-04-01") });
  await ensureProject("900003", {
    siteId: siteRetailRenewal,
    projectTitle: "基幹システム刷新 開発フェーズ",
    industry: "流通",
    startDate: new Date("2024-04-01"),
    endDate: new Date("2024-12-31"),
    overview: "在庫管理サブシステムの開発を担当",
    roleIds: [rolePg],
    skillIds: [java.skillId],
  });

  await upsertEmployee({
    employeeId: "900004",
    organizationUnitId: devGroup2Id,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "鈴木 花子",
    nameKana: "スズキ ハナコ",
  });
  await upsertUserAccount({ employeeId: "900004", email: "dev-suzuki@example.com", role: AccountRole.GENERAL_STAFF });
  await ensureEmployeeSkill({
    employeeId: "900004",
    skillId: typescript.skillId,
    skillVersionId: null,
    skillLevel: SkillLevel.EXPERT,
  });
  await ensureEmployeeSkill({
    employeeId: "900004",
    skillId: aws.skillId,
    skillVersionId: null,
    skillLevel: SkillLevel.PROFICIENT,
  });
  await ensureEmployeeCertification({ employeeId: "900004", certificationId: awsSaa, acquiredDate: new Date("2023-09-01") });
  await ensureProject("900004", {
    siteId: siteEcNewBuild,
    projectTitle: "ECサイト フロントエンド開発",
    industry: "流通",
    startDate: new Date("2025-01-01"),
    endDate: null,
    overview: "Next.jsによるフロントエンド開発、AWS上への構築",
    roleIds: [roleSe],
    skillIds: [typescript.skillId, aws.skillId],
  });

  await upsertEmployee({
    employeeId: "900005",
    organizationUnitId: infraSectionId,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "高橋 健一",
    nameKana: "タカハシ ケンイチ",
  });
  await upsertUserAccount({ employeeId: "900005", email: "dev-takahashi@example.com", role: AccountRole.GENERAL_STAFF });
  await ensureEmployeeSkill({ employeeId: "900005", skillId: aws.skillId, skillVersionId: null, skillLevel: SkillLevel.EXPERT });
  await ensureEmployeeSkill({ employeeId: "900005", skillId: docker.skillId, skillVersionId: null, skillLevel: SkillLevel.PROFICIENT });
  await ensureEmployeeSkill({ employeeId: "900005", skillId: kubernetes.skillId, skillVersionId: null, skillLevel: SkillLevel.PROFICIENT });
  await ensureEmployeeCertification({ employeeId: "900005", certificationId: ccna, acquiredDate: new Date("2021-06-01") });
  await ensureEmployeeCertification({ employeeId: "900005", certificationId: awsSaa, acquiredDate: new Date("2022-11-01") });

  await upsertEmployee({
    employeeId: "900006",
    organizationUnitId: devSectionId,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "田中 美咲",
    nameKana: "タナカ ミサキ",
  });
  await upsertUserAccount({ employeeId: "900006", email: "dev-tanaka@example.com", role: AccountRole.GENERAL_STAFF });
  await ensureEmployeeSkill({ employeeId: "900006", skillId: python.skillId, skillVersionId: null, skillLevel: SkillLevel.BASIC });

  await upsertEmployee({
    employeeId: "900007",
    organizationUnitId: infraSectionId,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "伊藤 誠",
    nameKana: "イトウ マコト",
  });
  await upsertUserAccount({ employeeId: "900007", email: "dev-ito@example.com", role: AccountRole.MANAGER });
  await ensureEmployeeSkill({ employeeId: "900007", skillId: azure.skillId, skillVersionId: null, skillLevel: SkillLevel.EXPERT });
  await ensureEmployeeCertification({ employeeId: "900007", certificationId: itilFoundation, acquiredDate: new Date("2020-03-01") });

  await upsertEmployee({
    employeeId: "900008",
    organizationUnitId: hrSectionId,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "渡辺 由美",
    nameKana: "ワタナベ ユミ",
  });
  await upsertUserAccount({ employeeId: "900008", email: "dev-watanabe@example.com", role: AccountRole.HR_SALES });

  await upsertEmployee({
    employeeId: "900009",
    organizationUnitId: salesSectionId,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "山本 隆",
    nameKana: "ヤマモト タカシ",
  });
  await upsertUserAccount({ employeeId: "900009", email: "dev-yamamoto@example.com", role: AccountRole.HR_SALES });

  // 部署未確定(事業部直下)社員: REF002/REF008の「未所属」除外ルール確認用
  await upsertEmployee({
    employeeId: "900010",
    organizationUnitId: salesDivisionId,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "中村 陽子",
    nameKana: "ナカムラ ヨウコ",
  });
  await upsertUserAccount({ employeeId: "900010", email: "dev-nakamura@example.com", role: AccountRole.GENERAL_STAFF });

  // 初回未登録社員: EDT001導線確認用
  await upsertEmployee({
    employeeId: "900011",
    organizationUnitId: devGroup1Id,
    isRegistered: false,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: null,
    nameKana: null,
  });
  await upsertUserAccount({ employeeId: "900011", email: "dev-kobayashi@example.com", role: AccountRole.GENERAL_STAFF });

  // 退職者: REF002一覧のデフォルト除外確認用
  await upsertEmployee({
    employeeId: "900012",
    organizationUnitId: devGroup2Id,
    isRegistered: true,
    employmentStatus: EmploymentStatus.RETIRED,
    name: "加藤 直樹",
    nameKana: "カトウ ナオキ",
  });
  await upsertUserAccount({ employeeId: "900012", email: "dev-kato@example.com", role: AccountRole.GENERAL_STAFF });

  await upsertEmployee({
    employeeId: "900013",
    organizationUnitId: devGroup1Id,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "吉田 さくら",
    nameKana: "ヨシダ サクラ",
  });
  await upsertUserAccount({ employeeId: "900013", email: "dev-yoshida@example.com", role: AccountRole.GENERAL_STAFF });
  // COBOLの保有者をこの1名のみにし、スキルマップの属人化リスク一覧の確認用データとする
  await ensureEmployeeSkill({ employeeId: "900013", skillId: cobol.skillId, skillVersionId: null, skillLevel: SkillLevel.EXPERT });
  await ensureEmployeeCertification({ employeeId: "900013", certificationId: ap, acquiredDate: new Date("2019-04-01") });
  await ensureProject("900013", {
    siteId: siteBankCore,
    projectTitle: "勘定系システム更改 移行フェーズ",
    industry: "金融",
    startDate: new Date("2023-05-01"),
    endDate: new Date("2025-03-31"),
    overview: "既存COBOL資産の仕様調査・移行設計をリード",
    roleIds: [rolePl, rolePm],
    skillIds: [cobol.skillId],
  });

  await upsertEmployee({
    employeeId: "900014",
    organizationUnitId: devGroup2Id,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "松本 亮",
    nameKana: "マツモト リョウ",
  });
  await upsertUserAccount({ employeeId: "900014", email: "dev-matsumoto@example.com", role: AccountRole.GENERAL_STAFF });
  await ensureEmployeeSkill({ employeeId: "900014", skillId: mysql.skillId, skillVersionId: null, skillLevel: SkillLevel.PROFICIENT });
  await ensureEmployeeSkill({ employeeId: "900014", skillId: docker.skillId, skillVersionId: null, skillLevel: SkillLevel.BASIC });
  await ensureEmployeeCertification({ employeeId: "900014", certificationId: dbSpecialist, acquiredDate: new Date("2024-04-01") });

  await upsertEmployee({
    employeeId: "900015",
    organizationUnitId: devSectionId,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "木村 遥",
    nameKana: "キムラ ハルカ",
  });
  await upsertUserAccount({ employeeId: "900015", email: "dev-kimura@example.com", role: AccountRole.GENERAL_STAFF });
  await ensureEmployeeSkill({
    employeeId: "900015",
    skillId: java.skillId,
    skillVersionId: java.versionIdByName.get("11") ?? null,
    skillLevel: SkillLevel.PROFICIENT,
  });
  await ensureEmployeeCertification({ employeeId: "900015", certificationId: oracleMasterSilver, acquiredDate: new Date("2023-02-01") });
  await ensureProject("900015", {
    siteId: siteManufacturingCloud,
    projectTitle: "生産管理システム クラウド移行検証",
    industry: "製造",
    startDate: new Date("2025-02-01"),
    endDate: new Date("2025-08-31"),
    overview: "移行後システムの結合テスト・性能テストを担当",
    roleIds: [roleTester],
    skillIds: [java.skillId],
  });

  await upsertEmployee({
    employeeId: "900016",
    organizationUnitId: infraSectionId,
    isRegistered: true,
    employmentStatus: EmploymentStatus.ACTIVE,
    name: "林 康平",
    nameKana: "ハヤシ コウヘイ",
  });
  await upsertUserAccount({ employeeId: "900016", email: "dev-hayashi@example.com", role: AccountRole.GENERAL_STAFF });
  await ensureEmployeeSkill({ employeeId: "900016", skillId: azure.skillId, skillVersionId: null, skillLevel: SkillLevel.PROFICIENT });
  await ensureEmployeeSkill({ employeeId: "900016", skillId: kubernetes.skillId, skillVersionId: null, skillLevel: SkillLevel.BASIC });
  await ensureEmployeeCertification({ employeeId: "900016", certificationId: pmp, acquiredDate: new Date("2021-10-01") });

  console.log("Seed完了: 社員16名(組織3事業部/5部署/2Gr、スキル10種、資格8種、プロジェクト経歴4件)");
  console.log("- dev-staff@example.com (GENERAL_STAFF, 未登録) → EDT001の確認用");
  console.log("- dev-manager@example.com (MANAGER, 登録済み) → マイページ/マスタ管理の確認用");
  console.log("- dev-kato@example.com (GENERAL_STAFF, 退職済み) → REF002除外確認用");
  console.log("- dev-yoshida@example.com (COBOLの唯一の保有者) → REF008属人化リスク確認用");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
