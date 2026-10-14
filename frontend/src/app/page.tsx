'use client'

import { useEffect, useState } from 'react'
import {
    Shield,
    Play,
    RefreshCw,
    Cpu,
    ArrowRight,
    CheckCircle2,
    Database,
} from 'lucide-react'
import { AUDIT_PRESETS } from '@/constants/presets'
import { AuditResult, VerificationCertificate } from '@/types/audit'
import { executeAudit } from '@/services/api'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import { TargetPresetSelector } from '@/components/features/audit/TargetPresetSelector'
import { AuditFindingsBanner } from '@/components/features/audit/AuditFindingsBanner'
import { AuditMetricCards } from '@/components/features/audit/AuditMetricCards'
import { ProbeMatrixGrid } from '@/components/features/audit/ProbeMatrixGrid'
import { CertificateModal } from '@/components/features/audit/CertificateModal'

export default function OverviewPage() {
    const [selectedTarget, setSelectedTarget] = useState<string>('victim')
    const [customUrl, setCustomUrl] = useState<string>('http://localhost:8000/predict')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [progress, setProgress] = useState<number>(0)
    const [statusMessage, setStatusMessage] = useState<string>('')
    const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
    const [certificate, setCertificate] = useState<VerificationCertificate | null>(null)
    const [showCertModal, setShowCertModal] = useState<boolean>(false)

    // Overview real metrics state
    const [overview, setOverview] = useState<{
        hardware?: { device: string }
        metrics?: {
            baseline_accuracy: number | null
            victim_clean_accuracy: number | null
            victim_trigger_accuracy: number | null
            victim_trigger_matches: number | null
            best_thief_agreement: number | null
            best_thief_budget: number | null
            latest_verification: any
        }
        status?: Record<string, string>
    }>({
        hardware: { device: 'CPU (AMD64)' },
        metrics: {
            baseline_accuracy: null,
            victim_clean_accuracy: null,
            victim_trigger_accuracy: null,
            victim_trigger_matches: null,
            best_thief_agreement: null,
            best_thief_budget: null,
            latest_verification: null,
        },
        status: {},
    })

    useEffect(() => {
        async function loadStats() {
            try {
                const res = await fetch('/api/overview-stats')
                if (res.ok) {
                    const data = await res.json()
                    setOverview(data)
                }
            } catch (e) {
                console.error('Failed to load overview stats:', e)
            }
        }
        loadStats()
    }, [])

    async function handleRunAudit() {
        setIsLoading(true)
        setProgress(15)
        setStatusMessage('Transmitting 80 cryptographic watermark probes to target...')
        setAuditResult(null)
        setCertificate(null)

        const progressTimer = setInterval(() => {
            setProgress((prev) => (prev < 85 ? prev + 25 : prev))
        }, 150)

        const targetVal = selectedTarget === 'custom' ? customUrl : selectedTarget
        const auditTypeVal = selectedTarget === 'custom' ? 'remote_http_api' : 'preset'

        try {
            const data = await executeAudit(targetVal, auditTypeVal)
            clearInterval(progressTimer)
            setProgress(100)
            setStatusMessage('Exact binomial test complete! Record saved to PostgreSQL.')

            setTimeout(() => {
                setAuditResult(data.audit)
                setCertificate(data.certificate)
                setIsLoading(false)
            }, 350)
        } catch (err: any) {
            clearInterval(progressTimer)
            setIsLoading(false)
            alert(`Audit failed: ${err.message}`)
        }
    }

    const pipelineStages = [
        { name: 'TRAIN', label: 'Baseline Control', status: overview?.status?.baseline || 'PENDING' },
        { name: 'WATERMARK', label: '80-Probe Victim', status: overview?.status?.watermark || 'PENDING' },
        { name: 'SERVE', label: 'FastAPI Black-Box', status: 'PASS' },
        { name: 'EXTRACT', label: '1k-5k Substitute', status: overview?.status?.extraction_1000 || 'PENDING' },
        { name: 'VERIFY', label: 'SciPy Binomial Test', status: overview?.status?.verification || 'PENDING' },
        { name: 'ADAPTIVE ATTACK', label: 'Clean Evasion', status: overview?.status?.adaptive_attack || 'PENDING' },
        { name: 'REPORT', label: 'Scientific Audit', status: overview?.status?.report || 'PENDING' },
    ]

    return (
        <div className="space-y-6">
            {/* Brand Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <div className="flex items-center gap-2">
                        <Tag className="text-[10px] font-bold uppercase tracking-wider bg-primary-subtle text-primary border-primary/20">
                            Deep Learning Security
                        </Tag>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight heading-text mt-2 flex items-center gap-2.5">
                        <Shield className="w-7 h-7 text-primary" />
                        ModelGuard Security Center
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Active Intellectual Property Watermarking & Black-Box Model Extraction Verification System
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Tag className="px-3 py-1 font-mono text-xs flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <Cpu className="w-3.5 h-3.5" />
                        {overview?.hardware?.device || 'CPU (AMD64)'}
                    </Tag>
                    <Tag className="px-3 py-1 font-mono text-xs text-success bg-success-subtle border-success/20 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" />
                        PostgreSQL 18.4
                    </Tag>
                </div>
            </div>

            {/* Visual ML Pipeline */}
            <Card>
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        End-to-End Experimental Research Pipeline
                    </h5>
                    <Tag className="text-[10px] font-mono bg-success-subtle text-success border-success/20">
                        Active Loop
                    </Tag>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
                    {pipelineStages.map((stage, idx) => {
                        const isPass = stage.status === 'PASS'
                        return (
                            <div key={stage.name} className="flex items-center gap-2">
                                <div
                                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                                        isPass
                                            ? 'bg-success-subtle border-success/30 text-success'
                                            : 'bg-gray-100 dark:bg-gray-700/60 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {isPass ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                                        )}
                                        <span className="font-bold">{stage.name}</span>
                                    </div>
                                    <div className="text-[10px] opacity-75 mt-0.5">{stage.label}</div>
                                </div>
                                {idx < pipelineStages.length - 1 && (
                                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 hidden lg:block" />
                                )}
                            </div>
                        )
                    })}
                </div>
            </Card>

            {/* Real Experimental Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Control Baseline Acc
                    </div>
                    <div className="text-2xl font-bold font-mono heading-text mt-1.5">
                        {overview?.metrics?.baseline_accuracy
                            ? `${(overview.metrics.baseline_accuracy * 100).toFixed(1)}%`
                            : 'PENDING'}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Unwatermarked reference model</p>
                </Card>

                <Card className="text-center">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Victim Clean Test Acc
                    </div>
                    <div className="text-2xl font-bold font-mono heading-text mt-1.5">
                        {overview?.metrics?.victim_clean_accuracy
                            ? `${(overview.metrics.victim_clean_accuracy * 100).toFixed(1)}%`
                            : 'PENDING'}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">CIFAR-10 test set accuracy</p>
                </Card>

                <Card className="text-center border-primary/40 bg-primary-subtle">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Trigger Probe Memorization
                    </div>
                    <div className="text-2xl font-bold font-mono text-primary mt-1.5">
                        {overview?.metrics?.victim_trigger_accuracy != null
                            ? `${(overview.metrics.victim_trigger_accuracy * 100).toFixed(1)}%`
                            : 'PENDING'}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        {overview?.metrics?.victim_trigger_matches != null
                            ? `${overview.metrics.victim_trigger_matches}/80`
                            : '80'}{' '}
                        probes verified
                    </p>
                </Card>

                <Card className="text-center">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Best Thief Agreement
                    </div>
                    <div className="text-2xl font-bold font-mono heading-text mt-1.5">
                        {overview?.metrics?.best_thief_agreement
                            ? `${(overview.metrics.best_thief_agreement * 100).toFixed(1)}%`
                            : 'PENDING'}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                        Fidelity at {overview?.metrics?.best_thief_budget || '5,000'} queries
                    </p>
                </Card>
            </div>

            {/* Target Selector Card */}
            <Card>
                <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h5 className="font-bold heading-text text-base">
                        Interactive Ownership Verification Studio
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Interrogate any trained checkpoint preset or external API endpoint with the secret 80 watermark probes. Exact binomial hypothesis testing runs in real time via SciPy.
                    </p>
                </div>
                <div className="pt-4 space-y-4">
                    <TargetPresetSelector
                        presets={AUDIT_PRESETS}
                        selectedTarget={selectedTarget}
                        onSelectTarget={setSelectedTarget}
                        customUrl={customUrl}
                        onChangeCustomUrl={setCustomUrl}
                    />

                    {/* Action Trigger */}
                    <div className="pt-5 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <Button
                            type="button"
                            onClick={handleRunAudit}
                            disabled={isLoading}
                            variant="solid"
                            icon={
                                isLoading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                    <Play className="w-4 h-4 fill-current mr-1" />
                                )
                            }
                        >
                            {isLoading ? 'Interrogating Probes...' : 'Execute Exact Binomial Verification Audit'}
                        </Button>
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            80 Secret Probes &bull; Null Rate p0 = 10.0% &bull; Significance &alpha; = 0.01
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {isLoading && (
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-mono">
                                <span>{statusMessage}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Audit Findings Result */}
            {auditResult && (
                <div className="space-y-4">
                    <AuditFindingsBanner stats={auditResult.stats} />
                    <AuditMetricCards auditResult={auditResult} />
                    <ProbeMatrixGrid
                        matchesMask={auditResult.all_matches_mask}
                        onViewCertificate={() => setShowCertModal(true)}
                    />
                </div>
            )}

            {/* Official Certificate Dialog */}
            <CertificateModal
                open={showCertModal}
                onOpenChange={setShowCertModal}
                certificate={certificate}
            />
        </div>
    )
}
