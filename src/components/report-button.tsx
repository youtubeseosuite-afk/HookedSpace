// src/components/report-button.tsx
// NY FIL. Lille "Rapportér"-knap, der åbner rapport-vinduet. Bruges fx på gruppesiden.

"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import ReportDialog, { type ReportTarget } from "@/components/report-dialog";

export default function ReportButton({
  targetType,
  targetId,
  label = "Rapportér",
}: {
  targetType: ReportTarget;
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-deep-700 hover:text-red-700 hover:underline"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
        {label}
      </button>
      {open && <ReportDialog targetType={targetType} targetId={targetId} onClose={() => setOpen(false)} />}
    </>
  );
}
