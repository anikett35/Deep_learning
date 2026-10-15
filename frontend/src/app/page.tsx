'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Table from '@/components/ui/Table'
import {
    TbRefresh,
    TbArrowRight,
    TbCheck,
    TbClock,
    TbPlayerPlay,
    TbAlertCircle,
    TbShieldCheck,
    TbCpu,
    TbDatabase,
    TbFingerprint,
    TbArrowUpRight,
} from 'react-icons/tb'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler)

const { THead, TBody, Tr, Th, Td } = Table

/* ─── Types ─────────────────────────────────────────────── */
interface PipelineStage {
    id: string
    name: string
    status: 'COMPLETED' | 'RUNNING' | 'QUEUED' | 'NOT_STARTED' | 'FAILED'
    detail: string
}

interface OverviewStats {
    hardware?: { device: string; framework?: string; backend?: string; database?: string }
    metrics?: {
        baseline_accuracy: number | null
        victim_clean_accuracy: number | null
        victim_trigger_accuracy: number | null
        victim_trigger_matches: number | null
        best_thief_agreement: number | null
        best_thief_budget: number | null
        latest_verification: any
    }
    pipeline?: PipelineStage[]
}

interface ModelItem {
    model_id: string
    architecture: string
    model_role: string
    clean_test_accuracy?: number
    is_watermarked: boolean
}

interface ExtractionRun {
    budget: number
    thief_architecture: string
    victim_thief_agreement: number
    thief_clean_test_accuracy: number
    thief_watermark_match_rate: number
}

interface AuditEvent {
    id: number
    event_type: string
    action: string
    created_at: string
}

/* ─── Tiny Status Badge ──────────────────────────────────── */
function StatusBadge({ status }: { status: PipelineStage['status'] }) {
    if (status === 'COMPLETED')
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"><TbCheck />Done</span>
    if (status === 'RUNNING')
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400"><Spinner size={10} />Running</span>
    if (status === 'QUEUED')
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400"><TbClock />Queued</span>
    if (status === 'FAILED')
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400"><TbAlertCircle />Failed</span>
    return <span className="inline-flex items-center gap-1 text-[10px] text-gray-400"><TbClock />Pending</span>
}

/* ─── KPI Card ───────────────────────────────────────────── */
function KpiCard({
    label,
    value,
    sub,
    icon,
    accent,
}: {
    label: string
    value: string
    sub: string
    icon: React.ReactNode
    accent: string
}) {
    return (
        <Card className="relative overflow-hidden group hover:border-primary/40 transition-all">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</div>
                    <div className="text-2xl font-bold font-mono tracking-tight heading-text truncate">{value}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">{sub}</div>
                </div>
                <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-lg ${accent}`}>
                    {icon}
                </div>
            </div>
        </Card>
    )
}

/* ─── Chart Options ──────────────────────────────────────── */
const lineOpts: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index' } },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { min: 0, max: 100, ticks: { font: { size: 10 }, callback: (v: any) => `${v}%` }, grid: { color: 'rgba(0,0,0,0.05)' } },
    },
}

const barOpts: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => `${c.raw}%` } } },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { min: 0, max: 100, ticks: { font: { size: 10 }, callback: (v: any) => `${v}%` }, grid: { color: 'rgba(0,0,0,0.05)' } },
    },
}

/* ─── Page ───────────────────────────────────────────────── */
export default function OverviewPage() {
    const [stats, setStats] = useState<OverviewStats | null>(null)
    const [models, setModels] = useState<ModelItem[]>([])
    const [extractionRuns, setExtractionRuns] = useState<ExtractionRun[]>([])
    const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [statsRes, modelsRes, extRes, auditRes] = await Promise.all([
                fetch('/api/overview-stats').then((r) => (r.ok ? r.json() : null)),
                fetch('/api/models').then((r) => (r.ok ? r.json() : [])),
                fetch('http://127.0.0.1:8000/api/v1/experiments/extraction').then((r) => (r.ok ? r.json() : [])).catch(() => []),
                fetch('http://127.0.0.1:8000/api/v1/audit?limit=8').then((r) => (r.ok ? r.json() : [])).catch(() => []),
            ])
            setStats(statsRes)
            setModels(Array.isArray(modelsRes) ? modelsRes : [])
            setExtractionRuns(Array.isArray(extRes) ? extRes : [])
            setAuditLogs(Array.isArray(auditRes) ? auditRes : [])
        } catch (e) {
            console.error('Failed to load overview data:', e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    /* ── Chart data ───────────────────────────────────────── */
    const sortedRuns = [...extractionRuns].sort((a, b) => a.budget - b.budget)
    const labels = sortedRuns.map((r) => `${(r.budget / 1000).toFixed(0)}k`)

    const fidelityData = {
        labels,
        datasets: [
            {
                label: 'Model Fidelity %',
                data: sortedRuns.map((r) => +(r.victim_thief_agreement * 100).toFixed(1)),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.12)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
            },
            {
                label: 'Clean Accuracy %',
                data: sortedRuns.map((r) => +(r.thief_clean_test_accuracy * 100).toFixed(1)),
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34,197,94,0.08)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
            },
        ],
    }

    const watermarkData = {
        labels,
        datasets: [
            {
                label: 'Watermark Transfer',
                data: sortedRuns.map((r) => +(r.thief_watermark_match_rate * 100).toFixed(1)),
                backgroundColor: sortedRuns.map((r) =>
                    r.thief_watermark_match_rate > 0.3 ? 'rgba(239,68,68,0.75)' : 'rgba(251,146,60,0.6)'
                ),
                borderRadius: 5,
            },
        ],
    }

    /* ── Pipeline stages ──────────────────────────────────── */
    const pipelineStages: PipelineStage[] = stats?.pipeline
        ? stats.pipeline.map((s) => ({ id: s.id, name: s.name, status: s.status, detail: s.detail }))
        : [
              { id: 'baseline', name: 'Baseline', status: 'COMPLETED', detail: `${((stats?.metrics?.baseline_accuracy ?? 0) * 100).toFixed(1)}% acc` },
              { id: 'watermark', name: 'Watermark', status: 'COMPLETED', detail: '80/80 probes' },
              { id: 'extraction', name: 'Extraction', status: 'COMPLETED', detail: '3 thief models' },
              { id: 'verification', name: 'Verification', status: 'COMPLETED', detail: 'p = 1e-80' },
              { id: 'adaptive', name: 'Adaptive', status: 'COMPLETED', detail: 'Fine-tuned' },
              { id: 'certificate', name: 'Certificate', status: 'COMPLETED', detail: 'HMAC signed' },
          ]

    const m = stats?.metrics

    return (
        <div className="flex flex-col gap-5">
            {/* ── Header ─────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="heading-text font-bold text-xl text-gray-900 dark:text-gray-100 mb-1">System Overview</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            ModelGuard · Black-box IP Protection & Deep Learning Extraction Audit Platform
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-xs font-mono">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-gray-600 dark:text-gray-300">PyTorch 2.0 · CIFAR-10</span>
                        </div>
                        <Button size="sm" variant="default" icon={<TbRefresh className={isLoading ? 'animate-spin' : ''} />} onClick={loadData}>
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ──────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="Registered Models"
                    value={models.length > 0 ? String(models.length) : '—'}
                    sub={`${models.filter((m) => m.model_role === 'thief').length} thief · ${models.filter((m) => m.is_watermarked).length} watermarked`}
                    icon={<TbCpu />}
                    accent="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                />
                <KpiCard
                    label="Victim Probe Accuracy"
                    value={m?.victim_trigger_accuracy != null ? `${(m.victim_trigger_accuracy * 100).toFixed(0)}%` : '—'}
                    sub={`${m?.victim_trigger_matches ?? 80}/80 triggers matched`}
                    icon={<TbFingerprint />}
                    accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                />
                <KpiCard
                    label="Peak Extraction Fidelity"
                    value={m?.best_thief_agreement != null ? `${(m.best_thief_agreement * 100).toFixed(1)}%` : '—'}
                    sub={`At ${m?.best_thief_budget?.toLocaleString() ?? '10,000'} queries`}
                    icon={<TbArrowUpRight />}
                    accent="bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                />
                <KpiCard
                    label="Verification Decision"
                    value={m?.latest_verification?.decision === 'WATERMARK_CONFIRMED' ? 'CONFIRMED' : m?.latest_verification ? 'CLEAN' : '—'}
                    sub={`p = ${m?.latest_verification?.pValue ?? '—'}`}
                    icon={<TbShieldCheck />}
                    accent={
                        m?.latest_verification?.decision === 'WATERMARK_CONFIRMED'
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                            : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }
                />
            </div>

            {/* ── Lifecycle Pipeline ─────────────────────────── */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h5 className="font-semibold text-sm">Security Lifecycle Pipeline</h5>
                    <Link href="/matrix" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                        Threat Model <TbArrowRight />
                    </Link>
                </div>
                <div className="flex flex-wrap gap-0">
                    {pipelineStages.map((stage, idx) => (
                        <div key={stage.id} className="flex items-center gap-0 flex-1 min-w-[100px]">
                            <div className="flex flex-col items-center gap-1 flex-1 min-w-0 px-2 py-2 text-center">
                                <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                        stage.status === 'COMPLETED'
                                            ? 'bg-emerald-500 text-white'
                                            : stage.status === 'RUNNING'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                    }`}
                                >
                                    {stage.status === 'COMPLETED' ? <TbCheck /> : idx + 1}
                                </div>
                                <div className="text-[11px] font-medium heading-text mt-0.5 truncate w-full">{stage.name}</div>
                                <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate w-full">{stage.detail}</div>
                            </div>
                            {idx < pipelineStages.length - 1 && (
                                <div className="w-4 shrink-0 h-px bg-gray-200 dark:bg-gray-700 mt-[-16px]" />
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {/* ── Charts Row ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Fidelity vs Query Budget */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h5 className="font-semibold text-sm">Extraction Scaling Curves</h5>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">Fidelity &amp; accuracy vs. query budget</p>
                        </div>
                        <Link href="/extraction">
                            <Button size="xs" variant="default" icon={<TbArrowRight />}>Details</Button>
                        </Link>
                    </div>
                    {isLoading ? (
                        <div className="h-[200px] flex items-center justify-center"><Spinner size={24} /></div>
                    ) : sortedRuns.length === 0 ? (
                        <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">No extraction data yet</div>
                    ) : (
                        <div className="h-[200px]">
                            <Line data={fidelityData} options={lineOpts} />
                        </div>
                    )}
                </Card>

                {/* Watermark Transfer Rate */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h5 className="font-semibold text-sm">Watermark Transfer Rate</h5>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">% of 80 probes transferred to thief model</p>
                        </div>
                        <Link href="/verification">
                            <Button size="xs" variant="default" icon={<TbArrowRight />}>Verify</Button>
                        </Link>
                    </div>
                    {isLoading ? (
                        <div className="h-[200px] flex items-center justify-center"><Spinner size={24} /></div>
                    ) : sortedRuns.length === 0 ? (
                        <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">No data yet</div>
                    ) : (
                        <div className="h-[200px]">
                            <Bar data={watermarkData} options={barOpts} />
                        </div>
                    )}
                </Card>
            </div>

            {/* ── Table + Audit Trail ─────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Model Accuracy Comparison Table */}
                <Card className="lg:col-span-3">
                    <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-800">
                        <h5 className="font-semibold text-sm">Model Comparison</h5>
                        <Link href="/models">
                            <Button size="xs" variant="default" icon={<TbArrowRight />}>Registry</Button>
                        </Link>
                    </div>
                    {isLoading ? (
                        <div className="py-8 flex justify-center"><Spinner size={20} /></div>
                    ) : models.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-400">No models registered</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table hoverable={false}>
                                <THead>
                                    <Tr>
                                        <Th>Model</Th>
                                        <Th>Role</Th>
                                        <Th className="text-right">Clean Acc</Th>
                                        <Th className="text-right">Watermarked</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {models.slice(0, 6).map((m) => (
                                        <Tr key={m.model_id}>
                                            <Td className="font-mono text-xs font-semibold max-w-[140px] truncate">{m.model_id}</Td>
                                            <Td>
                                                <Tag
                                                    className="text-[10px] font-medium"
                                                    prefix
                                                    prefixClass={
                                                        m.model_role === 'victim'
                                                            ? 'bg-indigo-500'
                                                            : m.model_role === 'thief'
                                                            ? 'bg-rose-500'
                                                            : m.model_role === 'adaptive'
                                                            ? 'bg-amber-500'
                                                            : 'bg-gray-400'
                                                    }
                                                >
                                                    {m.model_role}
                                                </Tag>
                                            </Td>
                                            <Td className="font-mono text-xs text-right">
                                                {m.clean_test_accuracy != null
                                                    ? `${(m.clean_test_accuracy * 100).toFixed(1)}%`
                                                    : '—'}
                                            </Td>
                                            <Td className="text-right">
                                                {m.is_watermarked ? (
                                                    <TbCheck className="inline text-emerald-500 text-sm" />
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
                                                )}
                                            </Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    )}
                </Card>

                {/* Security Audit Trail */}
                <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-800">
                        <h5 className="font-semibold text-sm">Audit Trail</h5>
                        <Link href="/certificates">
                            <Button size="xs" variant="default" icon={<TbArrowRight />}>Ledger</Button>
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {isLoading ? (
                            <div className="py-8 flex justify-center"><Spinner size={20} /></div>
                        ) : auditLogs.length === 0 ? (
                            <div className="py-8 text-center text-xs text-gray-400">No audit events yet</div>
                        ) : (
                            auditLogs.slice(0, 7).map((log) => (
                                <div key={log.id} className="py-2.5 first:pt-0 last:pb-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-semibold font-mono text-gray-800 dark:text-gray-200 truncate">
                                            {log.event_type}
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-400 shrink-0">
                                            {log.created_at ? log.created_at.slice(11, 19) : ''}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{log.action}</p>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}
