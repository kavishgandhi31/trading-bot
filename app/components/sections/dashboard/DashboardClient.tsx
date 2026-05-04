"use client";

/**
 * Client-side wrapper for the dashboard report list. Owns:
 *   • Posture filter state
 *   • Sort key state
 *
 * The reports themselves are loaded server-side in `app/page.tsx` and passed
 * in pre-decorated. Filtering and sorting happen here so changes feel
 * instant.
 *
 * Settings (recipients, portfolio, schedules) are NOT this component's
 * concern — they live behind a separate `<DashboardSettings>` button in the
 * top nav.
 */

import { useMemo, useState } from "react";
import type { Posture } from "@/app/components/sections/howtobuy/types";
import DashboardCard from "./DashboardCard";
import FilterBar, { type SortKey } from "./FilterBar";
import type { DashboardReport } from "./types";

interface Props {
  reports: DashboardReport[];
}

const POSTURE_RANK: Record<Posture, number> = {
  deploy_full: 0,
  deploy_partial: 1,
  starter_only: 2,
  watch_only: 3,
  avoid: 4,
};

export default function DashboardClient({ reports }: Props) {
  const [posture, setPosture] = useState<Posture | "all">("all");
  const [sort, setSort] = useState<SortKey>("actionable");

  const countsByPosture = useMemo(() => {
    const counts: Partial<Record<Posture, number>> = {};
    for (const r of reports) {
      counts[r.posture] = (counts[r.posture] ?? 0) + 1;
    }
    return counts;
  }, [reports]);

  const filtered = useMemo(() => {
    const list =
      posture === "all"
        ? reports
        : reports.filter((r) => r.posture === posture);

    const sorted = [...list];
    if (sort === "actionable") {
      sorted.sort((a, b) => {
        const da = POSTURE_RANK[a.posture] ?? 99;
        const db = POSTURE_RANK[b.posture] ?? 99;
        if (da !== db) return da - db;
        return (b.conviction ?? 0) - (a.conviction ?? 0);
      });
    } else if (sort === "conviction") {
      sorted.sort((a, b) => (b.conviction ?? 0) - (a.conviction ?? 0));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.refreshedAt).getTime() -
          new Date(a.refreshedAt).getTime()
      );
    }
    return sorted;
  }, [reports, posture, sort]);

  return (
    <div className="space-y-4">
      <FilterBar
        total={reports.length}
        countsByPosture={countsByPosture}
        selectedPosture={posture}
        onPostureChange={setPosture}
        sort={sort}
        onSortChange={setSort}
      />

      {filtered.length === 0 ? (
        <EmptyFilteredState />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <DashboardCard key={r.slug} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyFilteredState() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
      <p className="text-slate-400 text-[15px]">
        No reports match this filter yet.
      </p>
    </div>
  );
}
