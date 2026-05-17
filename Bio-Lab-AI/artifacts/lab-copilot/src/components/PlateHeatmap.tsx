import { useState } from "react";

interface WellData {
  well: string;
  row: string;
  col: number;
  value: number | null;
  status: "ok" | "blank" | "high" | "low";
  cv_pct: number | null;
}

interface PlateStats {
  mean: number | null;
  sd: number | null;
  cv_pct: number | null;
  min: number | null;
  max: number | null;
  blank_count: number;
  well_count: number;
}

interface PlateHeatmapProps {
  wells: WellData[];
  stats: PlateStats;
  wavelength?: string | null;
  compact?: boolean;
}

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function interpolateColor(t: number): string {
  const stops = [
    { t: 0.0, r: 59, g: 130, b: 246 },
    { t: 0.33, r: 34, g: 197, b: 94 },
    { t: 0.66, r: 234, g: 179, b: 8 },
    { t: 1.0, r: 239, g: 68, b: 68 },
  ];

  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }

  const range = hi.t - lo.t;
  const f = range === 0 ? 0 : (t - lo.t) / range;
  const r = Math.round(lo.r + f * (hi.r - lo.r));
  const g = Math.round(lo.g + f * (hi.g - lo.g));
  const b = Math.round(lo.b + f * (hi.b - lo.b));
  return `rgb(${r},${g},${b})`;
}

export function PlateHeatmap({ wells, stats, wavelength, compact = false }: PlateHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    well: string;
    value: number | null;
    status: string;
    x: number;
    y: number;
  } | null>(null);

  const wellMap = new Map<string, WellData>();
  for (const w of wells) wellMap.set(w.well, w);

  const { min, max } = stats;
  const range = (min !== null && max !== null && max > min) ? max - min : 1;

  const getNorm = (value: number | null): number => {
    if (value === null || min === null) return 0;
    return Math.max(0, Math.min(1, (value - min) / range));
  };

  const getWellStyle = (w: WellData): React.CSSProperties => {
    if (w.value === null || w.status === "blank") {
      return {
        backgroundColor: "hsl(var(--muted))",
        opacity: 0.4,
        border: "1px solid hsl(var(--border))",
      };
    }
    const t = getNorm(w.value);
    return {
      backgroundColor: interpolateColor(t),
      border: w.status === "high" || w.status === "low"
        ? "2px solid hsl(var(--destructive))"
        : "1px solid transparent",
    };
  };

  const cellSize = compact ? "w-7 h-7 text-[9px]" : "w-8 h-8 text-[10px]";
  const labelSize = compact ? "text-[9px]" : "text-[10px]";

  return (
    <div className="select-none">
      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="flex items-center gap-0.5 mb-1 ml-6">
            {COLS.map((c) => (
              <div
                key={c}
                className={`${compact ? "w-7" : "w-8"} text-center font-mono ${labelSize} text-muted-foreground`}
              >
                {c}
              </div>
            ))}
          </div>

          {ROWS.map((r) => (
            <div key={r} className="flex items-center gap-0.5 mb-0.5">
              <div
                className={`w-5 text-right font-mono ${labelSize} text-muted-foreground mr-1 flex-shrink-0`}
              >
                {r}
              </div>
              {COLS.map((c) => {
                const wellId = `${r}${c}`;
                const well = wellMap.get(wellId);
                if (!well) {
                  return (
                    <div
                      key={wellId}
                      className={`${cellSize} rounded-full bg-muted/30 flex-shrink-0`}
                    />
                  );
                }
                return (
                  <div
                    key={wellId}
                    className={`${cellSize} rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer transition-transform hover:scale-110 hover:z-10 relative`}
                    style={getWellStyle(well)}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({
                        well: wellId,
                        value: well.value,
                        status: well.status,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%,-100%)" }}
        >
          <div className="bg-popover border border-border rounded-md shadow-lg px-2.5 py-1.5 text-xs font-mono">
            <div className="font-semibold text-foreground">{tooltip.well}</div>
            <div className="text-muted-foreground">
              {tooltip.value !== null ? tooltip.value.toFixed(4) : "N/A"}
              {wavelength ? ` @ ${wavelength}` : ""}
            </div>
            <div
              className={
                tooltip.status === "blank"
                  ? "text-muted-foreground"
                  : tooltip.status === "high" || tooltip.status === "low"
                  ? "text-destructive"
                  : "text-emerald-500"
              }
            >
              {tooltip.status === "blank"
                ? "Blank / No signal"
                : tooltip.status === "high"
                ? "⚠ High outlier"
                : tooltip.status === "low"
                ? "⚠ Low outlier"
                : "OK"}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="flex gap-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <div
                key={t}
                className="w-4 h-3 rounded-sm"
                style={{ backgroundColor: interpolateColor(t) }}
              />
            ))}
          </div>
          <span className="font-mono">
            {min?.toFixed(3)} – {max?.toFixed(3)}
          </span>
          {wavelength && <span>nm: {wavelength}</span>}
        </div>

        <div className="flex gap-3 text-xs font-mono text-muted-foreground ml-auto">
          {stats.mean !== null && <span>Mean: {stats.mean}</span>}
          {stats.sd !== null && <span>SD: {stats.sd}</span>}
          {stats.cv_pct !== null && (
            <span className={stats.cv_pct > 20 ? "text-destructive" : stats.cv_pct > 10 ? "text-yellow-500" : "text-emerald-500"}>
              CV: {stats.cv_pct.toFixed(1)}%
            </span>
          )}
          {stats.blank_count > 0 && (
            <span className="text-muted-foreground">{stats.blank_count} blank</span>
          )}
        </div>
      </div>
    </div>
  );
}
