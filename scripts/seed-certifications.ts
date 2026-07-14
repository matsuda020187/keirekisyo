// SAS 人事グレード別 取得資格マップ（技術職向け）に沿った資格マスタ投入スクリプト。
// 実行: npx tsx scripts/seed-certifications.ts
// certification_category / certification は既存データを壊さないよう、
// カテゴリ名・資格名で検索してあれば更新、なければ新規作成する(冪等)。
import "dotenv/config";
import { prisma } from "../lib/prisma";

const CREATED_BY = "seed";
const CREATED_PROGRAM = "seed-certifications";

type CertificationSeed = { name: string; organization: string };

const CERTIFICATIONS_BY_CATEGORY: Record<string, CertificationSeed[]> = {
  システム開発: [
    { name: "システムアーキテクト試験", organization: "IPA（独立行政法人情報処理推進機構）" },
    { name: "情報処理安全確保支援士試験", organization: "IPA（独立行政法人情報処理推進機構）" },
    { name: "応用情報技術者試験", organization: "IPA（独立行政法人情報処理推進機構）" },
    { name: "基本情報技術者試験", organization: "IPA（独立行政法人情報処理推進機構）" },
    { name: "ITパスポート試験", organization: "IPA（独立行政法人情報処理推進機構）" },
    { name: "情報セキュリティマネジメント試験", organization: "IPA（独立行政法人情報処理推進機構）" },
    { name: "情報セキュリティ初級認定試験", organization: "全日本情報学習振興協会" },
    { name: "CISSP", organization: "ISC2" },
  ],
  データベース: [
    { name: "データベーススペシャリスト試験", organization: "IPA（独立行政法人情報処理推進機構）" },
    { name: "Oracle Master Platinum", organization: "Oracle" },
    { name: "Oracle Master Gold", organization: "Oracle" },
    { name: "Oracle Master Silver", organization: "Oracle" },
    { name: "Oracle Master Bronze", organization: "Oracle" },
    { name: "OSS-DB Gold", organization: "LPI-Japan" },
    { name: "OSS-DB Silver", organization: "LPI-Japan" },
    { name: "AWS Certified Database - Specialty", organization: "Amazon Web Services（AWS）" },
    { name: "Google Cloud Certified - Professional Cloud Architect", organization: "Google Cloud" },
    { name: "Google Cloud Certified - Professional Data Engineer", organization: "Google Cloud" },
    { name: "AWS Certified Machine Learning - Specialty", organization: "Amazon Web Services（AWS）" },
    { name: "Google Cloud Certified - Professional Machine Learning Engineer", organization: "Google Cloud" },
    { name: "Microsoft Certified: Azure Cosmos DB Developer Specialty", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure AI Engineer Associate", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure Database Administrator Associate", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure Data Scientist Associate", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure Data Engineer Associate", organization: "Microsoft" },
    { name: "Microsoft Certified: Power BI Data Analyst Associate", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure AI Fundamentals", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure Data Fundamentals", organization: "Microsoft" },
    { name: "AI-E検定（E資格）", organization: "日本ディープラーニング協会（JDLA）" },
    { name: "AI-G検定（G検定）", organization: "日本ディープラーニング協会（JDLA）" },
  ],
  インフラ: [
    { name: "ネットワークスペシャリスト試験", organization: "IPA（独立行政法人情報処理推進機構）" },
    { name: "CCIE", organization: "Cisco Systems" },
    { name: "CCNP", organization: "Cisco Systems" },
    { name: "CCNA", organization: "Cisco Systems" },
    { name: "Cisco Certified CyberOps Professional", organization: "Cisco Systems" },
    { name: "Cisco Certified CyberOps Associate", organization: "Cisco Systems" },
    { name: "AWS Certified Solutions Architect - Professional", organization: "Amazon Web Services（AWS）" },
    { name: "AWS Certified DevOps Engineer - Professional", organization: "Amazon Web Services（AWS）" },
    { name: "AWS Certified Advanced Networking - Specialty", organization: "Amazon Web Services（AWS）" },
    { name: "AWS Certified Security - Specialty", organization: "Amazon Web Services（AWS）" },
    { name: "AWS Certified: SAP on AWS - Specialty", organization: "Amazon Web Services（AWS）" },
    { name: "AWS Certified Solutions Architect - Associate", organization: "Amazon Web Services（AWS）" },
    { name: "AWS Certified SysOps Administrator - Associate", organization: "Amazon Web Services（AWS）" },
    { name: "AWS Certified Cloud Practitioner", organization: "Amazon Web Services（AWS）" },
    { name: "Microsoft Certified: Azure Solutions Architect Expert", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure for SAP Workloads Specialty", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure Administrator Associate", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure Network Engineer Associate", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure Security Engineer Associate", organization: "Microsoft" },
    { name: "Microsoft Certified: Windows Server Hybrid Administrator Associate", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure Virtual Desktop Specialty", organization: "Microsoft" },
    { name: "Microsoft Certified: Teams Administrator Associate", organization: "Microsoft" },
    { name: "Microsoft 365 Certified: Fundamentals", organization: "Microsoft" },
    { name: "Microsoft Certified: Azure Fundamentals", organization: "Microsoft" },
    { name: "Google Cloud Certified - Professional Cloud Network Engineer", organization: "Google Cloud" },
    { name: "Google Cloud Certified - Professional Cloud Security Engineer", organization: "Google Cloud" },
    { name: "Google Cloud Certified - Professional Cloud DevOps Engineer", organization: "Google Cloud" },
    { name: "Google Cloud Certified - Professional Google Workspace Administrator", organization: "Google Cloud" },
    { name: "Google Cloud Certified - Associate Cloud Engineer", organization: "Google Cloud" },
    { name: "Google Cloud Certified - Cloud Digital Leader", organization: "Google Cloud" },
    { name: "CompTIA Advanced Security Practitioner (CASP+)", organization: "CompTIA" },
    { name: "CompTIA Cybersecurity Analyst (CySA+)", organization: "CompTIA" },
    { name: "CompTIA Security+", organization: "CompTIA" },
    { name: "CompTIA A+", organization: "CompTIA" },
    { name: "LPIC-1 / LinuC-1", organization: "LPI-Japan" },
    { name: "LPIC-2 / LinuC-2", organization: "LPI-Japan" },
    { name: "SPREAD情報セキュリティサポーター能力検定", organization: "Grafsec（草の根サイバーセキュリティ推進協議会）" },
    { name: "SPREAD情報セキュリティマイスター能力検定", organization: "Grafsec（草の根サイバーセキュリティ推進協議会）" },
  ],
  デベロップメントスキル: [
    { name: "ITIL Foundation", organization: "PeopleCert" },
    { name: "ITIL Expert", organization: "PeopleCert" },
    { name: "ITIL Strategic Leader (SL)", organization: "PeopleCert" },
    { name: "ITIL Managing Professional", organization: "PeopleCert" },
    { name: "DX検定", organization: "日本イノベーション融合学会" },
    { name: "DX検定（プロフェッショナル）", organization: "日本イノベーション融合学会" },
    { name: "OMG Certified UML Professional 2 (OCUP2) Foundation", organization: "Object Management Group（OMG）" },
    { name: "OMG Certified UML Professional 2 (OCUP2) Intermediate", organization: "Object Management Group（OMG）" },
    { name: "OMG Certified UML Professional 2 (OCUP2) Advanced", organization: "Object Management Group（OMG）" },
    { name: "Javaプログラマ（Oracle Certified Java Programmer）", organization: "Oracle" },
    { name: "Javaプログラマ Bronze（Oracle Certified Java Programmer, Bronze）", organization: "Oracle" },
    { name: "Rails技術者認定ベーシック", organization: "Rails技術者認定試験運営委員会" },
    { name: "Rails技術者認定ブロンズ", organization: "Rails技術者認定試験運営委員会" },
    { name: "Rails技術者認定シルバー", organization: "Rails技術者認定試験運営委員会" },
    { name: "HTML5プロフェッショナル認定試験 レベル1", organization: "LPI-Japan" },
    { name: "HTML5プロフェッショナル認定試験 レベル2", organization: "LPI-Japan" },
    { name: "Ruby技術者認定試験 Silver", organization: "Rubyアソシエーション" },
    { name: "Ruby技術者認定試験 Gold", organization: "Rubyアソシエーション" },
    { name: "Androidアプリケーション技術者認定試験 ベーシック", organization: "(推定) IT-CASA" },
    { name: "Androidアプリケーション技術者認定試験 プロフェッショナル", organization: "(推定) IT-CASA" },
    { name: "Androidプラットフォーム技術者認定試験 ベーシック", organization: "(推定) IT-CASA" },
    { name: "Androidプラットフォーム技術者認定試験 プロフェッショナル", organization: "(推定) IT-CASA" },
    { name: "Microsoft Office Specialist (MOS)", organization: "Microsoft" },
    { name: "Microsoft Office Specialist (MOS) 上級（Expert）", organization: "Microsoft" },
    { name: "WEBデザイン技能検定3級", organization: "インターネットスキル認定普及協会（国家検定）" },
    { name: "WEBデザイン技能検定2級", organization: "インターネットスキル認定普及協会（国家検定）" },
    { name: "WEBデザイン技能検定1級", organization: "インターネットスキル認定普及協会（国家検定）" },
    { name: "アジャイルソフトウェア開発技術者検定試験", organization: "アジャイルソフトウエア開発技術者検定試験コンソーシアム" },
    { name: "スクラムマスター（認定スクラムマスター）", organization: "Scrum Alliance" },
    { name: "プロダクトオーナー（認定スクラムプロダクトオーナー）", organization: "Scrum Alliance" },
    { name: "RPA技術者検定 エキスパート", organization: "NTTデータ" },
    { name: "Python 3 エンジニア認定基礎試験", organization: "Pythonエンジニア育成推進協会" },
    { name: "Python 3 エンジニア認定実践試験", organization: "Pythonエンジニア育成推進協会" },
    { name: "Python 3 エンジニア認定データ分析試験", organization: "Pythonエンジニア育成推進協会" },
    { name: "Microsoft Certified: Power Automate RPA Developer Associate", organization: "Microsoft" },
    { name: "WebPerformer技術者認定試験 Basic", organization: "キヤノンITソリューションズ" },
    { name: "WebPerformer技術者認定試験 Expert", organization: "キヤノンITソリューションズ" },
    { name: "AWS Certified Developer - Associate", organization: "Amazon Web Services（AWS）" },
    { name: "Microsoft Certified: Azure Developer Associate", organization: "Microsoft" },
  ],
  プロダクションスキル: [
    { name: "システム監査技術者試験", organization: "IPA（独立行政法人情報処理推進機構）" },
    { name: "中小企業診断士", organization: "中小企業診断協会" },
    { name: "ITストラテジスト試験", organization: "IPA（独立行政法人情報処理推進機構）" },
  ],
  マネジメント: [
    { name: "プロジェクトマネージャ試験", organization: "IPA（独立行政法人情報処理推進機構）" },
    { name: "ITサービスマネージャ試験", organization: "IPA（独立行政法人情報処理推進機構）" },
    { name: "キャリアコンサルティング技能士", organization: "キャリアコンサルティング協議会（国家検定・厚生労働省）" },
    { name: "コーチングファシリテーター（認定コーチング・ファシリテータ）", organization: "日本コーチ連盟" },
    { name: "人工知能プロジェクトマネージャー試験", organization: "新技術応用推進基盤" },
    { name: "認定セルフアセッサー", organization: "経営品質協議会" },
    { name: "公認情報セキュリティマネージャー（CISM）", organization: "ISACA" },
    { name: "社会保険労務士", organization: "全国社会保険労務士会連合会" },
    { name: "メンタルヘルス・マネジメント検定2種", organization: "大阪商工会議所" },
    { name: "メンタルヘルス・マネジメント検定3種", organization: "大阪商工会議所" },
    { name: "ビジネスマネジャー検定試験", organization: "東京商工会議所" },
    { name: "PMP（プロジェクトマネジメント・プロフェッショナル）", organization: "PMI（Project Management Institute）" },
    { name: "CAPM（Certified Associate in Project Management）", organization: "PMI（Project Management Institute）" },
    { name: "ビジネス実務法務検定試験1級", organization: "東京商工会議所" },
    { name: "ビジネス実務法務検定試験2級", organization: "東京商工会議所" },
    { name: "ビジネス実務法務検定試験3級", organization: "東京商工会議所" },
    { name: "ビジネスキャリア検定 労務管理2級", organization: "中央職業能力開発協会（JAVADA）" },
    { name: "ビジネスキャリア検定 労務管理3級", organization: "中央職業能力開発協会（JAVADA）" },
    { name: "個人情報取扱主任者", organization: "日本クレジット協会" },
    { name: "個人情報保護士認定試験", organization: "全日本情報学習振興協会" },
    { name: "eco検定（環境社会検定試験）", organization: "東京商工会議所" },
  ],
  金融: [
    { name: "証券アナリスト（CMA）", organization: "日本証券アナリスト協会" },
    { name: "銀行業務検定試験3級（主要3科目）", organization: "経済法令研究会" },
    { name: "銀行業務検定試験2級（主要3科目）", organization: "経済法令研究会" },
    { name: "銀行業務検定試験3級（金融）", organization: "経済法令研究会" },
    { name: "証券外務員一種資格試験", organization: "日本証券業協会" },
    { name: "証券外務員二種資格試験", organization: "日本証券業協会" },
    { name: "FP技能士1級", organization: "金融財政事情研究会／日本FP協会" },
    { name: "FP技能士2級", organization: "金融財政事情研究会／日本FP協会" },
    { name: "FP技能士3級", organization: "金融財政事情研究会／日本FP協会" },
    { name: "クレジット債権管理士", organization: "日本クレジット協会" },
    { name: "貸金業務取扱主任者", organization: "日本貸金業協会" },
    { name: "簿記検定2級", organization: "日本商工会議所" },
    { name: "簿記検定3級", organization: "日本商工会議所" },
    { name: "クレディッター（クレジット審査業務能力検定 一般コース）", organization: "日本クレジット協会" },
    { name: "シニアクレディッター（クレジット審査業務能力検定 上級コース）", organization: "日本クレジット協会" },
  ],
  流通: [
    { name: "販売士1級", organization: "日本商工会議所" },
    { name: "販売士2級", organization: "日本商工会議所" },
    { name: "販売士3級", organization: "日本商工会議所" },
    { name: "ロジスティクス管理2級", organization: "中央職業能力開発協会（JAVADA）" },
    { name: "ロジスティクス管理3級", organization: "中央職業能力開発協会（JAVADA）" },
    { name: "通関士", organization: "財務省（税関）" },
    { name: "ネットショップ実務士（ネットショップ検定）", organization: "ネットショップ能力認定機構" },
    { name: "D2Cエキスパート検定1級", organization: "D2Cエキスパート協会" },
    { name: "D2Cエキスパート検定2級", organization: "D2Cエキスパート協会" },
    { name: "D2Cエキスパート検定3級", organization: "D2Cエキスパート協会" },
    { name: "D2Cスペシャリスト：デジタルマーケティング", organization: "D2Cエキスパート協会" },
    { name: "D2Cスペシャリスト：通販データドリブンマーケティング", organization: "D2Cエキスパート協会" },
    { name: "D2Cスペシャリスト：フルフィルメントCX", organization: "D2Cエキスパート協会" },
    { name: "モバイルシステム技術検定1級", organization: "MCPC（モバイルコンピューティング推進コンソーシアム）" },
    { name: "モバイルシステム技術検定2級", organization: "MCPC（モバイルコンピューティング推進コンソーシアム）" },
    { name: "モバイルシステム技術検定 基礎級", organization: "MCPC（モバイルコンピューティング推進コンソーシアム）" },
    { name: "色彩検定1級", organization: "色彩検定協会（A.F.T）" },
    { name: "Webデザイナー検定エキスパート", organization: "CG-ARTS（画像情報教育振興協会）" },
    { name: "Webデザイナー検定ベーシック", organization: "CG-ARTS（画像情報教育振興協会）" },
  ],
};

async function upsertCategory(name: string): Promise<number> {
  const existing = await prisma.certificationCategory.findFirst({
    where: { certificationCategoryName: name, deletedAt: null },
  });
  if (existing) return existing.id;

  const created = await prisma.certificationCategory.create({
    data: {
      certificationCategoryName: name,
      createdBy: CREATED_BY,
      createdProgram: CREATED_PROGRAM,
      updatedBy: CREATED_BY,
      updatedProgram: CREATED_PROGRAM,
    },
  });
  return created.id;
}

async function upsertCertification(categoryId: number, cert: CertificationSeed): Promise<void> {
  await prisma.certification.upsert({
    where: { certificationName: cert.name },
    update: {
      certificationCategoryId: categoryId,
      certificationOrganization: cert.organization,
      updatedBy: CREATED_BY,
      updatedProgram: CREATED_PROGRAM,
    },
    create: {
      certificationCategoryId: categoryId,
      certificationName: cert.name,
      certificationOrganization: cert.organization,
      createdBy: CREATED_BY,
      createdProgram: CREATED_PROGRAM,
      updatedBy: CREATED_BY,
      updatedProgram: CREATED_PROGRAM,
    },
  });
}

async function main() {
  let categoryCount = 0;
  let certCount = 0;

  for (const [categoryName, certifications] of Object.entries(CERTIFICATIONS_BY_CATEGORY)) {
    const categoryId = await upsertCategory(categoryName);
    categoryCount += 1;
    for (const cert of certifications) {
      await upsertCertification(categoryId, cert);
      certCount += 1;
    }
  }

  console.log(`Seed完了: カテゴリ${categoryCount}件、資格${certCount}件(SAS人事グレード別取得資格マップ 技術職向け Ver2.6準拠)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
