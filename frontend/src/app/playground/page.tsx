'use client'

import { useState } from 'react'
import { Terminal } from 'lucide-react'
import { CIFAR10_CLASSES } from '@/constants/cifar10'
import { PredictionResponse } from '@/types/prediction'
import { predictSample } from '@/services/api'
import { SampleClassSelector } from '@/components/features/playground/SampleClassSelector'
import { PredictionResultCard } from '@/components/features/playground/PredictionResultCard'
import Tag from '@/components/ui/Tag'

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
        <div className="space-y-6">
            {/* Header */}
            <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                    <Tag className="text-[10px] font-bold uppercase tracking-wider bg-primary-subtle text-primary border-primary/20">
                        Inference Telemetry
                    </Tag>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight heading-text flex items-center gap-2.5">
                    <Terminal className="w-7 h-7 text-primary" />
                    Live API Inference & Query Telemetry
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Query the deployed victim model API in real time. Each query is evaluated, hashed, and logged to PostgreSQL.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
