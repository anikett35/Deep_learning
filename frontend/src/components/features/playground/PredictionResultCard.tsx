'use client'

import { PredictionResponse } from '@/types/prediction'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'

interface PredictionResultCardProps {
    prediction: PredictionResponse | null
    classes: readonly string[]
}

export function PredictionResultCard({
    prediction,
    classes,
}: PredictionResultCardProps) {
    return (
        <Card className="flex flex-col justify-between">
            <div>
                <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h5 className="font-bold heading-text text-base">
                        Model Output & Softmax Probabilities
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Real-time classification confidence and class distributions.
                    </p>
                </div>

                <div className="pt-4">
                    {prediction ? (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-center">
                                <div className="text-xs uppercase font-mono text-gray-500 dark:text-gray-400 font-semibold">
                                    Predicted Class
                                </div>
                                <div className="text-3xl font-bold font-mono tracking-tight text-gray-900 dark:text-gray-100 capitalize mt-1">
                                    {prediction.predicted_class}
                                </div>
                                <div className="mt-2">
                                    <Tag className="font-mono text-xs bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-bold">
                                        {(prediction.confidence * 100).toFixed(1)}% Confidence
                                    </Tag>
                                </div>
                            </div>

                            {/* Probability Distribution */}
                            <div className="space-y-1.5 pt-2">
                                <div className="text-xs font-semibold heading-text">
                                    Top Probability Distribution:
                                </div>
                                {classes.map((cls) => {
                                    const prob = prediction.probabilities
                                        ? prediction.probabilities[cls] || 0
                                        : 0
                                    const isTop = cls === prediction.predicted_class
                                    return (
                                        <div key={cls} className="space-y-0.5">
                                            <div className="flex justify-between text-[11px] font-mono">
                                                <span
                                                    className={
                                                        isTop
                                                            ? 'font-bold heading-text'
                                                            : 'text-gray-500 dark:text-gray-400'
                                                    }
                                                >
                                                    {cls}
                                                </span>
                                                <span
                                                    className={
                                                        isTop
                                                            ? 'font-bold heading-text'
                                                            : 'text-gray-500 dark:text-gray-400'
                                                    }
                                                >
                                                    {(prob * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        isTop
                                                            ? 'bg-primary'
                                                            : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                                    style={{
                                                        width: `${Math.max(2, prob * 100)}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center text-xs text-gray-400 font-mono">
                            Click any category on the left to run inference...
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-200 dark:border-gray-700 text-[11px] font-mono text-gray-400">
                Backend: ModelGuardCNN (PyTorch 2.14) &bull; Endpoint: POST /predict
            </div>
        </Card>
    )
}
