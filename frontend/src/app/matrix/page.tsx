'use client'

import { DEFENSE_STRATEGIES } from '@/constants/defenses'
import { DefenseMatrixTable } from '@/components/features/matrix/DefenseMatrixTable'

export default function DefenseMatrixPage() {
    return (
        <div className="flex flex-col gap-5">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="heading-text font-bold text-xl text-gray-900 dark:text-gray-100 mb-1">Threat Model & Defense Matrix</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Comparative evaluation of intellectual property defense strategies under black-box query stealing and model evasion attacks.
                        </p>
                    </div>
                </div>
            </div>

            {/* Comparison Table */}
            <DefenseMatrixTable defenses={DEFENSE_STRATEGIES} />
        </div>
    )
}
