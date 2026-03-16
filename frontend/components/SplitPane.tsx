"use client";

import { type ReactNode } from "react";

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  leftClassName?: string;
  rightClassName?: string;
}

export function SplitPane({
  left,
  right,
  leftClassName = "",
  rightClassName = "",
}: SplitPaneProps) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <div className={`min-h-[320px] overflow-auto ${leftClassName}`}>
        {left}
      </div>
      <div className={`min-h-[320px] overflow-auto ${rightClassName}`}>
        {right}
      </div>
    </div>
  );
}
