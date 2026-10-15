'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Spinner from '@/components/ui/Spinner'
import Progress from '@/components/ui/Progress'
import {
    TbRocket,
    TbRefresh,
    TbDownload,
    TbClock,
    TbCheck,
    TbAlertCircle,
    TbPlayerStop
} from 'react-icons/tb'

const { THead, TBody, Tr, Th, Td } = Table

interface ExtractionRun {
    budget: number
    actual_queries: number
    distillation_mode?: string
    thief_architecture: string
    victim_thief_agreement: number
    thief_clean_test_accuracy: number
    victim_clean_test_accuracy: number
    thief_watermark_match_rate: number
    training_time_seconds?: number
}

interface JobRecord {
    job_id: string
    job_type: string
    status: string
    progress_percent: number
    error_message?: string
    created_at: string
}

export default function ExtractionExperimentsPage() {
    const [runs, setRuns] = useState<ExtractionRun[]>([])
    const [jobs, setJobs] = useState<JobRecord[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [budget, setBudget] = useState<number>(1000)
    const [architecture, setArchitecture] = useState<string>('ThiefCNN')
    const [distillationMode, setDistillationMode] = useState<string>('hard')
    const [statusMessage, setStatusMessage] = useState<string | null>(null)

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [extRes, jobsRes] = await Promise.all([
                fetch('http://127.0.0.1:8000/api/v1/experiments/extraction').then((r) => (r.ok ? r.json() : [])).catch(() => []),
                fetch('/api/jobs').then((r) => (r.ok ? r.json() : [])).catch(() => [])
            ])
            setRuns(Array.isArray(extRes) ? extRes : [])
            setJobs(Array.isArray(jobsRes) ? jobsRes.filter((j: any) => j.job_type === 'extraction') : [])
        } catch (e) {
            console.error('Failed to load extraction experiments:', e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
        const interval = setInterval(loadData, 5000)
        return () => clearInterval(interval)
    }, [])

    const handleLaunchJob = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setStatusMessage(null)
        try {
            const res = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_type: 'extraction',
                    budget,
                    architecture,
                    distillation_mode: distillationMode,
                    fast_mode: true
                })
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.detail || data.error || 'Failed to submit extraction job')
            }
            setStatusMessage(`Job ${data.job_id} launched successfully.`)
            loadData()
        } catch (err: any) {
            setStatusMessage(`Error: ${err.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const downloadCsv = () => {
        window.open('http://127.0.0.1:8000/api/v1/experiments/export/csv', '_blank')
    }

    const cancelJob = async (jobId: string) => {
        try {
            await fetch(`http://127.0.0.1:8000/api/v1/jobs/${jobId}/cancel`, { method: 'POST' })
            loadData()
        } catch (err) {
            console.error('Failed to cancel job:', err)
        }
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="heading-text font-bold text-xl text-gray-900 dark:text-gray-100">Extraction Experiments</h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                ADVERSARIAL SIMULATION
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Simulate black-box query-stealing attacks and evaluate substitute model fidelity and watermark transferability.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="default"
                            onClick={downloadCsv}
                            icon={<TbDownload />}
                        >
                            Export CSV
                        </Button>
                        <Button
                            size="sm"
                            variant="default"
                            onClick={loadData}
                            icon={<TbRefresh className={isLoading ? 'animate-spin' : ''} />}
                        >
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {/* Launch Job Panel */}
            <Card>
                <div className="pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                    <h5 className="font-semibold text-sm">Simulate Black-Box Theft</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Distill the victim API into a substitute architecture to evaluate IP retention.
                    </p>
                </div>

                {statusMessage && (
                    <div className="mb-3 p-2.5 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">
                        {statusMessage}
                    </div>
                )}

                <form onSubmit={handleLaunchJob} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
                    <div>
                        <label className="block text-gray-600 dark:text-gray-400 mb-1 font-medium">Query Budget</label>
                        <select
                            value={budget}
                            onChange={(e) => setBudget(parseInt(e.target.value, 10))}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary text-xs"
                        >
                            <option value={1000}>1,000 queries</option>
                            <option value={5000}>5,000 queries</option>
                            <option value={10000}>10,000 queries</option>
                            <option value={20000}>20,000 queries</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-600 dark:text-gray-400 mb-1 font-medium">Substitute Topology</label>
                        <select
                            value={architecture}
                            onChange={(e) => setArchitecture(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary text-xs"
                        >
                            <option value="ThiefCNN">ThiefCNN (Heterogeneous ConvNet)</option>
                            <option value="ResNet18CIFAR">ResNet18CIFAR (Residual Network)</option>
                            <option value="MobileNetV2CIFAR">MobileNetV2CIFAR (Inverted Residual)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-600 dark:text-gray-400 mb-1 font-medium">Distillation Mode</label>
                        <select
                            value={distillationMode}
                            onChange={(e) => setDistillationMode(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary text-xs"
                        >
                            <option value="hard">Hard-Label (Argmax top-1)</option>
                            <option value="soft">Soft-Label (Temperature T=3)</option>
                        </select>
                    </div>

                    <div>
                        <Button
                            size="sm"
                            variant="solid"
                            type="submit"
                            className="w-full"
                            loading={isSubmitting}
                            icon={<TbRocket />}
                        >
                            Execute Simulation
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Active Execution Jobs (if any) */}
            {jobs.length > 0 && (
                <Card>
                    <div className="pb-3 mb-2 border-b border-gray-100 dark:border-gray-800">
                        <h5 className="font-semibold text-sm">Background Execution Jobs</h5>
                    </div>
                    <div className="space-y-3">
                        {jobs.map((job) => (
                            <div
                                key={job.job_id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50/60 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 text-xs"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-semibold">{job.job_id}</span>
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                            job.status === 'RUNNING' ? 'bg-primary-subtle text-primary' :
                                            job.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' :
                                            job.status === 'FAILED' ? 'bg-rose-500/10 text-rose-500' :
                                            'bg-gray-200 dark:bg-gray-700 text-gray-600'
                                        }`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500">
                                        {job.error_message || `Extraction progress: ${job.progress_percent}%`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-32">
                                        <Progress percent={job.progress_percent} size="sm" showInfo={false} />
                                    </div>
                                    {job.status === 'RUNNING' && (
                                        <Button
                                            size="xs"
                                            variant="default"
                                            onClick={() => cancelJob(job.job_id)}
                                            icon={<TbPlayerStop />}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Empirical Results Table */}
            <Card>
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h5 className="font-semibold text-sm">Extraction Scaling Benchmark</h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Fidelity agreement, clean substitute accuracy, and watermark transfer across query budgets.
                        </p>
                    </div>
                    <span className="text-xs font-mono text-gray-400">
                        {runs.length} Runs Recorded
                    </span>
                </div>

                {isLoading ? (
                    <div className="py-16 flex flex-col items-center justify-center text-gray-400 space-y-2">
                        <Spinner size={24} />
                        <span className="text-xs">Loading benchmark telemetry...</span>
                    </div>
                ) : runs.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-400">
                        No extraction runs found. Launch an experiment above to record extraction telemetry.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table hoverable={false}>
                            <THead>
                                <Tr>
                                    <Th>Query Budget</Th>
                                    <Th>Distillation Mode</Th>
                                    <Th>Topology</Th>
                                    <Th className="text-right">Fidelity Agreement</Th>
                                    <Th className="text-right">Thief Clean Acc</Th>
                                    <Th className="text-right">Watermark Transfer</Th>
                                    <Th className="text-right">Compute Time</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {runs.map((r, i) => (
                                    <Tr key={i}>
                                        <Td className="font-mono font-semibold text-xs">
                                            {r.budget.toLocaleString()} queries
                                        </Td>
                                        <Td className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                                            {r.distillation_mode || 'hard'}
                                        </Td>
                                        <Td className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                            {r.thief_architecture}
                                        </Td>
                                        <Td className="font-mono text-xs text-right font-medium">
                                            {(r.victim_thief_agreement * 100).toFixed(1)}%
                                        </Td>
                                        <Td className="font-mono text-xs text-right text-gray-600 dark:text-gray-400">
                                            {(r.thief_clean_test_accuracy * 100).toFixed(1)}%
                                        </Td>
                                        <Td className="font-mono text-xs font-bold text-right text-primary">
                                            {(r.thief_watermark_match_rate * 100).toFixed(1)}%
                                        </Td>
                                        <Td className="font-mono text-xs text-right text-gray-400">
                                            {r.training_time_seconds ? `${r.training_time_seconds.toFixed(1)}s` : '—'}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    )
}
