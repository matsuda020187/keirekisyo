"use client";

import { useState } from "react";
import { buildHolderLine, type SkillMapCategory } from "@/lib/skill-map-data";

// カテゴリ内訳ドーナツの配色。カテゴリ数が多い場合でも色相を使い回さず、
// 9件目以降は「その他」としてグレーにまとめる(色でシリーズを表さない範囲は色を割り当てない)。
const PALETTE = [
  "#2a78d6",
  "#1baf7a",
  "#eda100",
  "#008300",
  "#4a3aa7",
  "#e34948",
  "#e87ba4",
  "#eb6834",
];
const OTHER_COLOR = "#c3c2b7";

type Slice = { label: string; count: number; color: string };

function buildSlices(items: SkillMapCategory["items"]): Slice[] {
  const top = items.slice(0, PALETTE.length);
  const rest = items.slice(PALETTE.length);
  const slices: Slice[] = top.map((item, index) => ({
    label: item.name,
    count: item.holders.length,
    color: PALETTE[index],
  }));
  const restTotal = rest.reduce((sum, item) => sum + item.holders.length, 0);
  if (restTotal > 0) slices.push({ label: `その他(${rest.length}件)`, count: restTotal, color: OTHER_COLOR });
  return slices;
}

function buildGradient(slices: Slice[], total: number): string {
  if (total === 0) return `conic-gradient(${OTHER_COLOR} 0% 100%)`;
  let cursor = 0;
  const stops = slices.map((slice) => {
    const start = (cursor / total) * 100;
    cursor += slice.count;
    const end = (cursor / total) * 100;
    return `${slice.color} ${start}% ${end}%`;
  });
  return `conic-gradient(${stops.join(",")})`;
}

export function CertificationPanel({ categories }: { categories: SkillMapCategory[] }) {
  const [activeId, setActiveId] = useState<number | undefined>(categories[0]?.id);
  const active = categories.find((c) => c.id === activeId) ?? categories[0];

  if (!active) {
    return <p className="text-sm text-gray-500">該当データがありません</p>;
  }

  const slices = buildSlices(active.items);
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const gradient = buildGradient(slices, total);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveId(category.id)}
            className={
              category.id === active.id
                ? "rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white"
                : "rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            }
          >
            {category.categoryName}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: gradient }}>
          <div className="absolute inset-[26px] flex flex-col items-center justify-center rounded-full bg-white">
            <b className="text-xl">{total}</b>
            <span className="text-[10px] text-gray-500">件</span>
          </div>
        </div>
        <div className="text-xs">
          {slices.map((slice) => (
            <div key={slice.label} className="mb-1.5 flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: slice.color }} />
              <span>
                {slice.label}({slice.count})
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 divide-y divide-gray-100">
        {active.items.map((item) => (
          <details key={item.id} className="py-1">
            <summary className="flex list-none items-center justify-between gap-3 py-1 text-sm cursor-pointer [&::-webkit-details-marker]:hidden">
              <span>{item.name}</span>
              <span className="text-gray-500">{item.holders.length}名</span>
            </summary>
            <p className="mt-1 pl-1 text-xs text-gray-600">{buildHolderLine(item.holders)}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
