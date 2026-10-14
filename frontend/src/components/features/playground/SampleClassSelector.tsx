'use client'

import { CheckCircle2 } from 'lucide-react'
import Card from '@/components/ui/Card'

interface SampleClassSelectorProps {
    classes: readonly string[]
    selectedClass: number
    onSelectClass: (idx: number) => void
    isLoading: boolean
}

export function SampleClassSelector({
    classes,
    selectedClass,
    onSelectClass,
    isLoading,
}: SampleClassSelectorProps) {
    return (
        <Card>
            <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <h5 className="font-bold heading-text text-base">
                    Select Benchmark Input Sample
                </h5>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Click a category sample to trigger live inference on the victim model.
                </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-4">
                {classes.map((clsName, idx) => (
                    <button
                        key={clsName}
                        type="button"
                        onClick={() => onSelectClass(idx)}
                        disabled={isLoading}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold capitalize transition-all duration-150 flex items-center justify-between cursor-pointer ${
                            selectedClass === idx
                                ? 'border-primary bg-primary text-white shadow-xs'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 heading-text'
                        }`}
                    >
                        <span>
                            {idx}: {clsName}
                        </span>
                        {selectedClass === idx && (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                    </button>
                ))}
            </div>
        </Card>
    )
}
