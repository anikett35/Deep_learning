import { BarChart3 } from 'lucide-react'
import { ResearchCharts } from '@/components/features/analytics/ResearchCharts'
import Tag from '@/components/ui/Tag'

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                    <Tag className="text-[10px] font-bold uppercase tracking-wider bg-info-subtle text-info border-info/20">
                        Benchmarking
                    </Tag>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight heading-text flex items-center gap-2.5">
                    <BarChart3 className="w-7 h-7 text-primary" />
                    Empirical Research Analytics & Key Findings
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Comprehensive benchmark curves documenting model extraction fidelity, watermark inheritance dynamics, and defense evasion survival.
                </p>
            </div>

            {/* Feature Charts */}
            <ResearchCharts />
        </div>
    )
}
