'use client'

import { useEffect, useState } from 'react'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Table from '@/components/ui/Table'
import Spinner from '@/components/ui/Spinner'
import { CheckCircle2, Clock } from 'lucide-react'

const { THead, TBody, Tr, Th, Td } = Table

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

export function ResearchCharts() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<{
        extraction: Record<string, any>
        adaptive: any
        status: Record<string, string>
    }>({
        extraction: {},
        adaptive: null,
        status: {},
    })

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/analytics-data')
                if (res.ok) {
                    const json = await res.json()
                    setData(json)
                }
            } catch (e) {
                console.error('Failed to load analytics data', e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const allBudgets = [1000, 5000, 10000, 20000]

    const agreementPoints: (number | null)[] = allBudgets.map((b) => {
        const item = data.extraction[String(b)]
        return item ? Number((item.victim_thief_agreement * 100).toFixed(1)) : null
    })

    const thiefAccPoints: (number | null)[] = allBudgets.map((b) => {
        const item = data.extraction[String(b)]
        return item ? Number((item.thief_clean_test_accuracy * 100).toFixed(1)) : null
    })

    const watermarkPoints: (number | null)[] = allBudgets.map((b) => {
        const item = data.extraction[String(b)]
        return item ? Number((item.thief_watermark_match_rate * 100).toFixed(1)) : null
    })

    const labels = allBudgets.map((b) => `${b.toLocaleString()} Q`)

    // Chart 1: Fidelity vs Clean Acc
    const chart1Data = {
        labels,
        datasets: [
            {
                label: 'Victim-Thief Agreement (%)',
                data: agreementPoints,
                borderColor: '#2a85ff', // Primary ModelGuard
                backgroundColor: 'rgba(42, 133, 255, 0.12)',
                borderWidth: 2.5,
                pointBackgroundColor: '#2a85ff',
                pointRadius: 4,
                tension: 0.3,
                fill: true,
            },
            {
                label: 'Thief Clean Test Acc (%)',
                data: thiefAccPoints,
                borderColor: '#10b981', // Success ModelGuard
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                borderWidth: 2,
                pointBackgroundColor: '#10b981',
                pointRadius: 4,
                tension: 0.3,
                fill: true,
            },
        ],
    }

    // Chart 2: Watermark Retention
    const chart2Data = {
        labels,
        datasets: [
            {
                label: 'Thief Watermark Match Rate (%)',
                data: watermarkPoints,
                borderColor: '#ff6a55', // Error / Crimson ModelGuard
                backgroundColor: 'rgba(255, 106, 85, 0.15)',
                borderWidth: 2.5,
                pointBackgroundColor: '#ff6a55',
                pointRadius: 5,
                tension: 0.3,
                fill: true,
            },
            {
                label: 'Null Rate Baseline p0 = 10%',
                data: [10, 10, 10, 10],
                borderColor: '#737373',
                borderDash: [5, 5],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
            },
        ],
    }

    // Chart 3: Adaptive Attack
    const adaptiveBeforeAcc = data.adaptive?.before?.thief_clean_test_accuracy
        ? (data.adaptive.before.thief_clean_test_accuracy * 100).toFixed(1)
        : null
    const adaptiveAfterAcc = data.adaptive?.after?.clean_test_accuracy
        ? (data.adaptive.after.clean_test_accuracy * 100).toFixed(1)
        : null
    const adaptiveBeforeWm = data.adaptive?.before?.thief_watermark_match_rate
        ? (data.adaptive.before.thief_watermark_match_rate * 100).toFixed(1)
        : null
    const adaptiveAfterWm = data.adaptive?.after?.watermark_match_rate
        ? (data.adaptive.after.watermark_match_rate * 100).toFixed(1)
        : null

    const chart3Data = {
        labels: ['Clean Test Accuracy (%)', 'Watermark Match Rate (%)'],
        datasets: [
            {
                label: 'Before Adaptive Attack',
                data: [
                    adaptiveBeforeAcc ? Number(adaptiveBeforeAcc) : 0,
                    adaptiveBeforeWm ? Number(adaptiveBeforeWm) : 0,
                ],
                backgroundColor: '#2a85ff',
                borderRadius: 6,
            },
            {
                label: 'After Clean Fine-Tuning',
                data: [
                    adaptiveAfterAcc ? Number(adaptiveAfterAcc) : 0,
                    adaptiveAfterWm ? Number(adaptiveAfterWm) : 0,
                ],
                backgroundColor: '#f59e0b',
                borderRadius: 6,
            },
        ],
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16 text-sm text-gray-500 gap-3">
                <Spinner size={32} />
                <span>Loading experimental analytics...</span>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Experiment Execution Status Banner */}
            <div className="flex flex-wrap gap-2 items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs">
                <span className="font-semibold heading-text uppercase tracking-wider mr-2">
                    Experiment State:
                </span>
                {allBudgets.map((b) => {
                    const isDone = data.extraction[String(b)]
                    return (
                        <Tag
                            key={b}
                            className={`font-mono text-xs ${
                                isDone
                                    ? 'bg-success-subtle text-success border-success/30 font-semibold'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 border-gray-300 dark:border-gray-600'
                            }`}
                        >
                            {isDone ? (
                                <CheckCircle2 className="w-3 h-3 mr-1 text-success inline" />
                            ) : (
                                <Clock className="w-3 h-3 mr-1 text-gray-400 inline" />
                            )}
                            {b.toLocaleString()} Q: {isDone ? 'COMPLETED' : 'PENDING'}
                        </Tag>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart 1 */}
                <Card>
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h5 className="font-bold heading-text text-base">
                                1. Extraction Fidelity Scaling
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Victim-thief agreement (fidelity) and thief accuracy scaling across black-box budgets.
                            </p>
                        </div>
                        <Tag className="text-[10px] bg-primary-subtle text-primary border-primary/20">
                            PyTorch Data
                        </Tag>
                    </div>
                    <div className="h-64 pt-4">
                        <Line
                            data={chart1Data}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        min: 0,
                                        max: 100,
                                        title: { display: true, text: 'Percentage (%)' },
                                    },
                                },
                            }}
                        />
                    </div>
                </Card>

                {/* Chart 2 */}
                <Card>
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h5 className="font-bold heading-text text-base">
                                2. Watermark Transfer Curve
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Empirical match rate of 80 secret trigger probes transferred to substitute model.
                            </p>
                        </div>
                        <Tag className="text-[10px] bg-error-subtle text-error border-error/20">
                            Null p0 = 10%
                        </Tag>
                    </div>
                    <div className="h-64 pt-4">
                        <Line
                            data={chart2Data}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        min: 0,
                                        max: 100,
                                        title: { display: true, text: 'Match Rate (%)' },
                                    },
                                },
                            }}
                        />
                    </div>
                </Card>
            </div>

            {/* Adaptive Attack Card */}
            <Card>
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h5 className="font-bold heading-text text-base">
                            3. Adaptive Attack Impact: Clean Fine-Tuning Evasion
                        </h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Evaluates whether fine-tuning the stolen model exclusively on clean domain samples weakens the embedded watermark.
                        </p>
                    </div>
                    <Tag
                        className={`text-xs ${
                            data.adaptive
                                ? 'bg-success-subtle text-success border-success/30 font-semibold'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        }`}
                    >
                        {data.adaptive ? 'REAL MEASUREMENT' : 'PENDING'}
                    </Tag>
                </div>
                <div className="pt-4">
                    {data.adaptive ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                            <div className="md:col-span-2 h-64">
                                <Bar
                                    data={chart3Data}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            y: {
                                                min: 0,
                                                max: 100,
                                                title: { display: true, text: 'Percentage (%)' },
                                            },
                                        },
                                    }}
                                />
                            </div>
                            <div className="space-y-3 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                                <div className="font-semibold heading-text uppercase tracking-wider">
                                    Empirical Findings:
                                </div>
                                <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1.5">
                                    <span className="text-gray-500 dark:text-gray-400">Clean Accuracy Delta:</span>
                                    <span className="font-mono font-bold text-success">
                                        {data.adaptive.deltas?.clean_accuracy_delta > 0 ? '+' : ''}
                                        {(data.adaptive.deltas?.clean_accuracy_delta * 100).toFixed(2)}%
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1.5">
                                    <span className="text-gray-500 dark:text-gray-400">Watermark Retention Delta:</span>
                                    <span className="font-mono font-bold text-warning">
                                        {(data.adaptive.deltas?.watermark_match_rate_delta * 100).toFixed(2)}%
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1.5">
                                    <span className="text-gray-500 dark:text-gray-400">Watermark State:</span>
                                    <span className="font-mono font-bold heading-text">
                                        {data.adaptive.watermark_survived ? 'SURVIVED' : 'WEAKENED/REMOVED'}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span className="text-gray-500 dark:text-gray-400">Clean Tuning Duration:</span>
                                    <span className="font-mono">{data.adaptive.duration_seconds}s</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-sm text-gray-500">
                            PENDING EXPERIMENT: Run `python ml/attacks/adaptive_finetune.py` to observe fine-tuning evasion trade-offs.
                        </div>
                    )}
                </div>
            </Card>

            {/* Real Experiment Inspection Table */}
            <Card>
                <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h5 className="font-bold heading-text text-base">
                        Extraction Experiments Log
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Summary of all executed black-box extraction runs and substitute model topologies.
                    </p>
                </div>
                <div className="pt-2">
                    <Table hoverable>
                        <THead>
                            <Tr>
                                <Th>Budget</Th>
                                <Th>Architecture</Th>
                                <Th>Agreement (Fidelity)</Th>
                                <Th>Thief Accuracy</Th>
                                <Th>Watermark Match</Th>
                                <Th>Training Time</Th>
                                <Th>Status</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {allBudgets.map((b) => {
                                const item = data.extraction[String(b)]
                                if (item) {
                                    return (
                                        <Tr key={b}>
                                            <Td className="font-mono font-bold heading-text">{b.toLocaleString()}</Td>
                                            <Td className="font-mono">{item.thief_architecture || 'ThiefCNN'}</Td>
                                            <Td className="font-mono text-primary font-bold">
                                                {(item.victim_thief_agreement * 100).toFixed(1)}%
                                            </Td>
                                            <Td className="font-mono">{(item.thief_clean_test_accuracy * 100).toFixed(1)}%</Td>
                                            <Td className="font-mono font-bold text-error">
                                                {(item.thief_watermark_match_rate * 100).toFixed(1)}% ({item.thief_watermark_matches}/80)
                                            </Td>
                                            <Td className="font-mono">{item.training_time_seconds?.toFixed(1)}s</Td>
                                            <Td>
                                                <Tag className="bg-success-subtle text-success border-success/30 font-semibold text-[10px]">
                                                    COMPLETED
                                                </Tag>
                                            </Td>
                                        </Tr>
                                    )
                                }
                                return (
                                    <Tr key={b} className="text-gray-400 italic">
                                        <Td className="font-mono">{b.toLocaleString()}</Td>
                                        <Td className="font-mono">ThiefCNN</Td>
                                        <Td>—</Td>
                                        <Td>—</Td>
                                        <Td>—</Td>
                                        <Td>—</Td>
                                        <Td>
                                            <Tag className="text-[10px] text-gray-400 border-dashed bg-gray-100 dark:bg-gray-800">
                                                PENDING
                                            </Tag>
                                        </Td>
                                    </Tr>
                                )
                            })}
                        </TBody>
                    </Table>
                </div>
            </Card>
        </div>
    )
}
