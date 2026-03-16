"use client";

import { useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  number: number;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  number,
  title,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-zinc-200 py-4 last:border-b-0 dark:border-zinc-700">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span
          className={`text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {number} {title}
        </span>
      </button>
      {open && <div className="mt-3 pl-5 text-zinc-700 dark:text-zinc-300">{children}</div>}
    </section>
  );
}
