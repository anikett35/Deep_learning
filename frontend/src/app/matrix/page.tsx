import { Scale } from 'lucide-react'
import { DEFENSE_STRATEGIES } from '@/constants/defenses'
import { DefenseMatrixTable } from '@/components/features/matrix/DefenseMatrixTable'
import Tag from '@/components/ui/Tag'

export default function DefenseMatrixPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                    <Tag className="text-[10px] font-bold uppercase tracking-wider bg-primary-subtle text-primary border-primary/20">
                        Threat Model Analysis
                    </Tag>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight heading-text flex items-center gap-2.5">
                    <Scale className="w-7 h-7 text-primary" />
                    Comparative Defense Matrix & Threat Model
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Why conventional defenses fail against black-box extraction attacks, and how ModelGuard establishes defensible ownership proof.
                </p>
            </div>

            {/* Comparison Table Feature Component */}
            <DefenseMatrixTable defenses={DEFENSE_STRATEGIES} />
        </div>
    )
}
