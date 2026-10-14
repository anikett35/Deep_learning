import { AuditResult } from '@/types/audit'
import Card from '@/components/ui/Card'

interface AuditMetricCardsProps {
    auditResult: AuditResult
}

export function AuditMetricCards({ auditResult }: AuditMetricCardsProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="text-center">
                <div className="text-2xl font-bold font-mono heading-text">
                    {auditResult.matches} / {auditResult.total_triggers}
                </div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mt-1">
                    Observed Matches
                </div>
            </Card>

            <Card className="text-center">
                <div className="text-2xl font-bold font-mono text-error">
                    {auditResult.stats.match_rate_pct}
                </div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mt-1">
                    Match Ratio
                </div>
            </Card>

            <Card className="text-center">
                <div className="text-2xl font-bold font-mono text-primary">
                    {auditResult.stats.p_value_formatted}
                </div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mt-1">
                    Binomial P-Value
                </div>
            </Card>

            <Card className="text-center">
                <div className="text-2xl font-bold font-mono text-success">
                    {auditResult.stats.confidence_percent.toFixed(2)}%
                </div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mt-1">
                    Confidence Score
                </div>
            </Card>
        </div>
    )
}
