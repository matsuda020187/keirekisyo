import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  formatDate,
  formatMonth,
  formatProjectEndMonth,
  getActiveProcesses,
  GENDER_LABELS,
  GRADUATION_STATUS_LABELS,
  PROCESS_LABELS,
  SCHOOL_TYPE_LABELS,
  type ResumeData,
} from "@/lib/resume-data";

// PDF出力用フォント。標準のHelvetica等は日本語グリフを含まないため、
// 日本語カバレッジを持つフォントを明示登録する(react-pdf/fontkitはTTF/WOFFのみ対応、
// woff2・可変フォントは非対応のため静的woffを使用)。
// このフォントに含まれない記号(◎○△、―等)はPDF出力時のみ別表記に置き換える。
Font.register({
  family: "NotoSansJP",
  src: path.join(process.cwd(), "assets/fonts/NotoSansJP-Regular.woff"),
});

// SKILL_LEVEL_LABELS(◎/○/△)はNotoSansJPに含まれないためPDF専用の表記を使う
const PDF_SKILL_LEVEL_LABELS: Record<string, string> = {
  EXPERT: "得意",
  PROFICIENT: "経験あり",
  BASIC: "基礎知識",
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "NotoSansJP" },
  title: { fontSize: 16, marginBottom: 12 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 12, marginBottom: 4, fontWeight: "bold" },
  line: { marginBottom: 2 },
  projectBox: { marginBottom: 8, padding: 6, border: "1pt solid #ccc" },
});

export function ResumePdfDocument({ employee }: { employee: ResumeData }) {
  const skillsByCategory = new Map<string, ResumeData["skills"]>();
  for (const employeeSkill of employee.skills) {
    const key = employeeSkill.skill.skillCategory.skillCategoryName;
    const list = skillsByCategory.get(key) ?? [];
    list.push(employeeSkill);
    skillsByCategory.set(key, list);
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>業務経歴書</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本情報</Text>
          <Text style={styles.line}>
            氏名: {employee.name ?? "-"}({employee.nameKana ?? "-"})
          </Text>
          <Text style={styles.line}>生年月日: {formatDate(employee.birthDate)}</Text>
          <Text style={styles.line}>性別: {employee.gender ? GENDER_LABELS[employee.gender] : "-"}</Text>
          <Text style={styles.line}>所属組織: {employee.organizationUnit?.unitName ?? "未所属"}</Text>
          <Text style={styles.line}>
            最寄駅: {employee.nearestStationLine ?? "-"} {employee.nearestStationName ?? ""}
          </Text>
          <Text style={styles.line}>経験年数: {employee.experienceYears ?? 0}年</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最終学歴</Text>
          <Text style={styles.line}>
            学校種別: {employee.finalSchoolType ? SCHOOL_TYPE_LABELS[employee.finalSchoolType] : "-"}
          </Text>
          <Text style={styles.line}>
            学校名: {employee.finalSchoolName ?? "-"} {employee.finalDepartmentName ?? ""}
          </Text>
          <Text style={styles.line}>卒業年月: {formatMonth(employee.graduationYearMonth)}</Text>
          <Text style={styles.line}>
            卒業状況:{" "}
            {employee.graduationStatus ? GRADUATION_STATUS_LABELS[employee.graduationStatus] : "-"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>経歴概要</Text>
          <Text style={styles.line}>{employee.careerSummary || "未登録"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>自己PR</Text>
          <Text style={styles.line}>{employee.selfPr || "未登録"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>スキル一覧</Text>
          {skillsByCategory.size === 0 && <Text style={styles.line}>未登録</Text>}
          {[...skillsByCategory.entries()].map(([category, list]) => (
            <View key={category} style={{ marginBottom: 4 }}>
              <Text style={styles.line}>{category}</Text>
              {list.map((es) => (
                <Text key={es.id} style={styles.line}>
                  ・{es.skill.skillName}
                  {es.skillVersion ? ` ${es.skillVersion.versionName}` : ""} -{" "}
                  {PDF_SKILL_LEVEL_LABELS[es.skillLevel]}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>資格一覧</Text>
          {employee.certifications.length === 0 && <Text style={styles.line}>未登録</Text>}
          {employee.certifications.map((ec) => (
            <Text key={ec.id} style={styles.line}>
              ・{formatMonth(ec.acquiredDate)} {ec.certification.certificationName}(
              {ec.certification.certificationOrganization})
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プロジェクト経歴</Text>
          {employee.projects.length === 0 && <Text style={styles.line}>未登録</Text>}
          {employee.projects.map((project) => {
            const activeProcesses = getActiveProcesses(project.detail);
            return (
              <View key={project.id} style={styles.projectBox}>
                <Text style={styles.line}>
                  {project.site.siteName} ／ {project.projectTitle}
                </Text>
                <Text style={styles.line}>
                  {formatMonth(project.startDate)} 〜 {formatProjectEndMonth(project.endDate)} ／{" "}
                  {project.industry ?? "-"}
                </Text>
                <Text style={styles.line}>
                  役割: {project.roleLinks.map((link) => link.projectRole.projectRoleName).join("、")}
                </Text>
                <Text style={styles.line}>
                  規模: {project.totalTeamSize ?? "-"}(チーム: {project.teamSize ?? "-"})
                </Text>
                {project.projectSummary && <Text style={styles.line}>{project.projectSummary}</Text>}
                {project.detail?.overview && (
                  <Text style={styles.line}>業務詳細: {project.detail.overview}</Text>
                )}
                {activeProcesses.length > 0 && (
                  <Text style={styles.line}>
                    担当工程: {activeProcesses.map((field) => PROCESS_LABELS[field]).join("、")}
                  </Text>
                )}
                {project.skills.length > 0 && (
                  <Text style={styles.line}>
                    使用スキル:{" "}
                    {project.skills
                      .map(
                        (ps) =>
                          `${ps.skill.skillName}${ps.skillVersion ? ` ${ps.skillVersion.versionName}` : ""}`,
                      )
                      .join("、")}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
