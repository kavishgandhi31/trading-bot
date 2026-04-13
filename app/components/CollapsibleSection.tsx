"use client";

import { useState } from "react";

export default function CollapsibleSection({
  label,
  title,
  children,
  defaultOpen = false,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full text-left py-5 cursor-pointer group"
      >
        <span
          className={`text-xl text-slate-400 group-hover:text-slate-600 transition-transform duration-300 ease-in-out ${open ? "rotate-90" : ""}`}
        >
          &#9656;
        </span>
        <div>
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-400">
            {label}
          </div>
          <div className="text-lg font-bold text-slate-900 leading-snug mt-0.5 group-hover:text-slate-700 transition-colors">
            {title}
          </div>
        </div>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="pl-7 pb-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
