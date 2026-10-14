'use client'

import { FileText } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface ProbeMatrixGridProps {
    matchesMask?: boolean[]
    onViewCertificate: () => void
}

export function ProbeMatrixGrid({
    matchesMask,
    onViewCertificate,
}: ProbeMatrixGridProps) {
    return (
        <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <h5 className="font-bold heading-text text-sm">
                        Trigger Probe Response Map (80 Probes)
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Visual inspection of model behavior on each secret probe. Crimson indicates replicated watermark response.
                    </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-error rounded-[3px]" />
                        Planted Match
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-[3px]" />
                        Independent
                    </span>
                </div>
            </div>

            {/* Probe Matrix Grid */}
            <div className="grid grid-cols-10 sm:grid-cols-20 gap-1.5 pt-4">
                {matchesMask?.map((isMatch: boolean, idx: number) => (
                    <div
                        key={idx}
                        title={`Probe #${idx + 1}: ${
                            isMatch
                                ? "Matched planted class 'airplane'"
                                : 'Independent output'
                        }`}
                        className={`aspect-square rounded-[4px] border transition-transform hover:scale-125 ${
                            isMatch
                                ? 'bg-error border-error-subtle shadow-xs'
                                : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        }`}
                    />
                ))}
            </div>

            {/* View Certificate Button */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={onViewCertificate}
                    icon={<FileText className="w-3.5 h-3.5 mr-1" />}
                >
                    View Official Ownership Certificate
                </Button>
            </div>
        </Card>
    )
}
