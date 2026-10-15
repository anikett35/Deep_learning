'use client'

import { useState } from 'react'
import { CIFAR10_CLASSES } from '@/constants/cifar10'
import { PredictionResponse } from '@/types/prediction'
import { predictSample } from '@/services/api'
import { SampleClassSelector } from '@/components/features/playground/SampleClassSelector'
import { PredictionResultCard } from '@/components/features/playground/PredictionResultCard'

export default function PlaygroundPage() {
    const [selectedClass, setSelectedClass] = useState<number>(0)
    const [prediction, setPrediction] = useState<PredictionResponse | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(false)

    async function handlePredict(clsIdx: number) {
        setSelectedClass(clsIdx)
        setIsLoading(true)

        try {
            const data = await predictSample(clsIdx)
            setPrediction(data)
        } catch (e: any) {
            console.error(e)
            alert(`Inference failed: ${e.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="heading-text font-bold text-xl text-gray-900 dark:text-gray-100">Inference Playground</h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                ENDPOINT ACTIVE
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Query the deployed victim model endpoint in real time. Each query response is logged to PostgreSQL with cryptographic latency telemetry.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SampleClassSelector
                    classes={CIFAR10_CLASSES}
                    selectedClass={selectedClass}
                    onSelectClass={handlePredict}
                    isLoading={isLoading}
                />

                <PredictionResultCard
                    prediction={prediction}
                    classes={CIFAR10_CLASSES}
                />
            </div>
        </div>
    )
}
