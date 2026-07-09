"use client";

import { useMemo, useState, type ReactNode } from "react";

type VirtualizedListProps<T> = {
  items: T[];
  rowHeight?: number;
  height?: number;
  overscan?: number;
  getKey: (item: T, index: number) => string | number;
  renderRow: (item: T, index: number) => ReactNode;
};

export default function VirtualizedList<T>({
  items,
  rowHeight = 56,
  height = 520,
  overscan = 8,
  getKey,
  renderRow,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = items.length * rowHeight;
  const range = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(height / rowHeight) + overscan * 2;
    const end = Math.min(items.length, start + visibleCount);
    return { start, end };
  }, [height, items.length, overscan, rowHeight, scrollTop]);

  return (
    <div
      className="overflow-y-auto"
      style={{ height, maxHeight: height }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${range.start * rowHeight}px)` }}>
          {items.slice(range.start, range.end).map((item, offset) => {
            const index = range.start + offset;
            return (
              <div key={getKey(item, index)} style={{ height: rowHeight }}>
                {renderRow(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
