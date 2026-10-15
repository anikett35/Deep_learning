'use client'

import { ResearchCharts } from '@/components/features/analytics/ResearchCharts'

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col gap-5">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="heading-text font-bold text-xl text-gray-900 dark:text-gray-100">Security Analytics</h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                                4 DEFENSE RADARS & BENCHMARKS
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Empirical benchmark curves documenting model extraction fidelity, watermark inheritance dynamics, and defense evasion survival.
                        </p>
                    </div>
                </div>
            </div>

            {/* Feature Charts */}
            <ResearchCharts />
        </div>
    )
}
