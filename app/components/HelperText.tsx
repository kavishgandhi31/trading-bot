"use client";

import { useState } from "react";

export default function HelperText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-1">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs text-violet-500 font-medium hover:text-violet-700 transition-colors cursor-pointer"
      >
        <span
          className={`text-sm transition-transform duration-300 ease-in-out ${open ? "rotate-90" : ""}`}
        >
          &#9656;
        </span>
        What this means
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="mt-1 ml-4 pl-3 py-1.5 text-xs text-slate-500 leading-relaxed border-l-2 border-violet-200 bg-violet-50/50 rounded-r">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}
