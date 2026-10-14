'use client'

import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'

interface TriggerProbe {
    id: number
    targetClass: string
    naturalClass: string
}

interface TriggerProbeGalleryProps {
    triggers: TriggerProbe[]
}

export function TriggerProbeGallery({ triggers }: TriggerProbeGalleryProps) {
    return (
        <Card>
            <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <h5 className="text-base font-semibold heading-text">
                    Sample Trigger Probes (Visual Micro-Stamp Inspection)
                </h5>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Each probe carries a high-frequency localized 4x4 alternating stamp in the bottom-right corner. Normal models see a natural object (cat, truck, dog), but a model extracted from the victim classifies them with high confidence as <strong>airplane</strong>.
                </p>
            </div>

            <div className="pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {triggers.map((t) => (
                        <div
                            key={t.id}
                            className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center space-y-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                            <div className="w-full aspect-square bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg relative overflow-hidden flex items-center justify-center">
                                {/* Simulated visual image pattern */}
                                <div className="w-full h-full opacity-60 bg-gray-100 dark:bg-gray-700" />
                                {/* 4x4 Corner Stamp */}
                                <div className="absolute bottom-1.5 right-1.5 w-4 h-4 grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5 bg-gray-900 dark:bg-black rounded-[2px] shadow-xs">
                                    <div className="bg-primary" />
                                    <div className="bg-error" />
                                    <div className="bg-error" />
                                    <div className="bg-primary" />
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-bold heading-text font-mono">
                                    Probe #{t.id}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium capitalize">
                                    Object: {t.naturalClass}
                                </div>
                                <div className="mt-1">
                                    <Tag className="text-[9px] px-1.5 py-0 font-mono bg-info-subtle text-info border-info/20">
                                        airplane
                                    </Tag>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    )
}
