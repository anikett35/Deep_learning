import { AuditStats } from '@/types/audit'
import Tag from '@/components/ui/Tag'

interface AuditFindingsBannerProps {
    stats: AuditStats
}

export function AuditFindingsBanner({ stats }: AuditFindingsBannerProps) {
    const isHighRisk = stats.risk_level === 'CRITICAL' || stats.risk_level === 'HIGH'

    return (
        <div
            className={`p-6 rounded-2xl border transition-all ${
                isHighRisk
                    ? 'bg-error-subtle border-error/30 text-error'
                    : 'bg-success-subtle border-success/30 text-success'
            }`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs font-mono uppercase font-bold tracking-wider opacity-80">
                        Forensic Finding
                    </div>
                    <div className="text-xl font-bold mt-0.5">
                        {stats.verdict}
                    </div>
                </div>
                <Tag
                    className={`font-mono text-xs px-3 py-1 uppercase font-bold ${
                        stats.risk_level === 'CRITICAL'
                            ? 'bg-error text-white border-error'
                            : stats.risk_level === 'HIGH'
                            ? 'bg-warning-subtle text-warning border-warning/30'
                            : 'bg-success-subtle text-success border-success/30'
                    }`}
                >
                    RISK: {stats.risk_level}
                </Tag>
            </div>
            <p className="mt-3 text-sm leading-relaxed font-normal text-gray-800 dark:text-gray-100">
                {stats.detailed_summary}
            </p>
        </div>
    )
}
