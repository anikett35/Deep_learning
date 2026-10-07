import { AuditStats } from "@/types/audit";
import { Badge } from "@/components/ui/badge";

interface AuditFindingsBannerProps {
  stats: AuditStats;
}

export function AuditFindingsBanner({ stats }: AuditFindingsBannerProps) {
  const isHighRisk = stats.risk_level === "CRITICAL" || stats.risk_level === "HIGH";

  return (
    <div
      className={`p-6 rounded-xl border ${
        isHighRisk ? "bg-rose-50/70 border-rose-200" : "bg-emerald-50/70 border-emerald-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono uppercase font-bold text-muted-foreground tracking-wider">
            Forensic Finding
          </div>
          <div
            className={`text-xl font-bold mt-0.5 ${
              isHighRisk ? "text-rose-900" : "text-emerald-900"
            }`}
          >
            {stats.verdict}
          </div>
        </div>
        <Badge
          variant={
            stats.risk_level === "CRITICAL"
              ? "danger"
              : stats.risk_level === "HIGH"
              ? "warning"
              : "success"
          }
          className="font-mono text-xs px-3 py-1 uppercase"
        >
          RISK: {stats.risk_level}
        </Badge>
      </div>
      <p className="mt-3 text-sm text-foreground/90 leading-relaxed font-normal">
        {stats.detailed_summary}
      </p>
    </div>
  );
}
