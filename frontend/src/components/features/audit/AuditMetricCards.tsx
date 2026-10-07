import { AuditResult } from "@/types/audit";
import { Card, CardContent } from "@/components/ui/card";

interface AuditMetricCardsProps {
  auditResult: AuditResult;
}

export function AuditMetricCards({ auditResult }: AuditMetricCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="py-4 text-center">
        <CardContent className="p-0">
          <div className="text-2xl font-bold font-mono text-foreground">
            {auditResult.matches} / {auditResult.total_triggers}
          </div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">
            Observed Matches
          </div>
        </CardContent>
      </Card>

      <Card className="py-4 text-center">
        <CardContent className="p-0">
          <div className="text-2xl font-bold font-mono text-rose-600">
            {auditResult.stats.match_rate_pct}
          </div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">
            Match Ratio
          </div>
        </CardContent>
      </Card>

      <Card className="py-4 text-center">
        <CardContent className="p-0">
          <div className="text-2xl font-bold font-mono text-blue-600">
            {auditResult.stats.p_value_formatted}
          </div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">
            Binomial P-Value
          </div>
        </CardContent>
      </Card>

      <Card className="py-4 text-center">
        <CardContent className="p-0">
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {auditResult.stats.confidence_percent.toFixed(2)}%
          </div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">
            Confidence Score
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
