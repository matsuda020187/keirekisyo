"use client";

import { useState } from "react";
import { buildHolderLine, type SkillMapCategory } from "@/lib/skill-map-data";

const TOP_COUNT = 10;

export function SkillPanel({ categories }: { categories: SkillMapCategory[] }) {
  const [activeId, setActiveId] = useState<number | undefined>(categories[0]?.id);
  const [showAll, setShowAll] = useState(false);
  const active = categories.find((c) => c.id === activeId) ?? categories[0];

  if (!active) {
    return <p className="text-sm text-gray-500">該当データがありません</p>;
  }

  const maxHolders = active.items[0]?.holders.length || 1;
  const visibleItems = showAll ? active.items : active.items.slice(0, TOP_COUNT);
  const hiddenCount = active.items.length - visibleItems.length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => {
              setActiveId(category.id);
              setShowAll(false);
            }}
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

      <div className="divide-y divide-gray-100">
        {visibleItems.map((item) => {
          const isRare = item.holders.length === 1;
          return (
            <details key={item.id} className="py-1">
              <summary className="grid cursor-pointer grid-cols-[150px_1fr_46px] items-center gap-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
                <span>
                  {item.name}
                  {isRare && (
                    <span className="ml-1.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                      1名のみ
                    </span>
                  )}
                </span>
                <span className="block h-[17px] overflow-hidden rounded-md bg-gray-100">
                  <span
                    className={`block h-full rounded-md ${isRare ? "bg-red-500" : "bg-blue-600"}`}
                    style={{ width: `${(item.holders.length / maxHolders) * 100}%` }}
                  />
                </span>
                <span className="text-right text-gray-600">{item.holders.length}名</span>
              </summary>
              <p className="py-1 pl-1 text-xs text-gray-600">{buildHolderLine(item.holders)}</p>
            </details>
          );
        })}
      </div>

      {(hiddenCount > 0 || (showAll && active.items.length > TOP_COUNT)) && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="rounded-full border border-gray-300 px-5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            {showAll ? "▲ 上位10件に戻る" : `▼ すべて表示(残り${hiddenCount}件)`}
          </button>
        </div>
      )}
    </div>
  );
}
