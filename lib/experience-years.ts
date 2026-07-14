export type ProjectDateRange = { startDate: Date; endDate: Date | null };

function monthIndex(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

// 経験年数の計算(docs/schema.md employeeテーブル参照)。
// 全プロジェクト期間の和集合(重複期間は1回)を月数換算し、12で割った整数部を年数とする。
// end_date=NULL(進行中)は計算時点(asOf)の年月まで含める。
export function calculateExperienceYears(ranges: ProjectDateRange[], asOf: Date): number {
  if (ranges.length === 0) return 0;

  const intervals = ranges
    .map((range) => ({
      start: monthIndex(range.startDate),
      end: monthIndex(range.endDate ?? asOf),
    }))
    .sort((a, b) => a.start - b.start);

  let totalMonths = 0;
  let currentStart = intervals[0].start;
  let currentEnd = intervals[0].end;

  for (let i = 1; i < intervals.length; i++) {
    const interval = intervals[i];
    if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end);
    } else {
      totalMonths += currentEnd - currentStart + 1;
      currentStart = interval.start;
      currentEnd = interval.end;
    }
  }
  totalMonths += currentEnd - currentStart + 1;

  return Math.floor(totalMonths / 12);
}
