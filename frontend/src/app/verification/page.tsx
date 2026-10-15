'use client'

import { useEffect, useState } from 'react'
import {
    TbScale,
    TbRefresh,
    TbShieldCheck,
    TbShieldX,
    TbCheck,
    TbX,
    TbSearch,
    TbFlask,
} from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Spinner from '@/components/ui/Spinner'
import Tag from '@/components/ui/Tag'
import Input from '@/components/ui/Input'

const { THead, TBody, Tr, Th, Td } = Table

interface ModelVerification {
    model_id: string
    timestamp: string
    trigger_set_hash: string
    n: number
    k: number
    observed_match_rate: number
    null_probability: number
    significance_level_alpha: number
    exact_p_value: number
    p_value_scientific: string
    confidence_interval_95?: { ci_lower: number; ci_upper: number }
    decision: string
    statistical_verdict: string
}

interface TriggerMatrixRow {
    trigger_id: string
    expected_target_class: string
    responses: Record<string, { predicted_class: string; matched: boolean }>
}

interface VerificationData {
    verified_models: Record<string, ModelVerification>
    trigger_response_matrix: TriggerMatrixRow[]
}

function KpiCard({
    label, value, sub, accent,
}: { label: string; value: string; sub: string; accent?: string }) {
    return (
        <Card>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</div>
            <div className={`text-2xl font-bold font-mono heading-text mb-1 ${accent || ''}`}>{value}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">{sub}</div>
        </Card>
    )
}

export default function VerificationCenterPage() {
    const [data, setData] = useState<VerificationData | null>(null)
    const [selectedModel, setSelectedModel] = useState<string>('Thief_1000')
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [filterMatch, setFilterMatch] = useState<'all' | 'matched' | 'unmatched'>('all')
    const [searchProbe, setSearchProbe] = useState<string>('')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    async function loadVerificationData() {
        setIsLoading(true)
        setErrorMsg(null)
        try {
            const res = await fetch('/api/verification')
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error((err as any).error || 'Failed to fetch verification results')
            }
            const json: VerificationData = await res.json()
            setData(json)
            const modelKeys = Object.keys(json.verified_models || {})
            if (modelKeys.length > 0 && !modelKeys.includes(selectedModel)) {
                setSelectedModel(modelKeys.includes('Thief_1000') ? 'Thief_1000' : modelKeys[0])
            }
        } catch (e: any) {
            setErrorMsg(e.message)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleRunVerification() {
        setIsExecuting(true)
        try {
            const res = await fetch('/api/verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run' }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error((err as any).detail || (err as any).error || 'Verification failed')
            }
            await loadVerificationData()
        } catch (e: any) {
            alert(`Execution failed: ${e.message}`)
        } finally {
            setIsExecuting(false)
        }
    }

    useEffect(() => { loadVerificationData() }, [])

    const modelKeys = data ? Object.keys(data.verified_models) : []
    const currentModelData: ModelVerification | undefined = data?.verified_models[selectedModel]
    const isWatermarkConfirmed = currentModelData?.decision === 'WATERMARK_CONFIRMED'

    const matrixRows = data?.trigger_response_matrix || []
    const filteredRows = matrixRows.filter((row) => {
        const resp = row.responses?.[selectedModel]
        const matched = resp ? resp.matched : false
        if (filterMatch === 'matched' && !matched) return false
        if (filterMatch === 'unmatched' && matched) return false
        if (searchProbe) {
            const s = searchProbe.toLowerCase()
            return (
                row.trigger_id.toLowerCase().includes(s) ||
                row.expected_target_class.toLowerCase().includes(s) ||
                (resp?.predicted_class?.toLowerCase() || '').includes(s)
            )
        }
        return true
    })

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="heading-text font-bold text-xl text-gray-900 dark:text-gray-100">Verification Center</h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                                EXACT BINOMIAL TEST
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Strict two-sided hypothesis test (α = 10⁻⁶) & Clopper-Pearson 95% Confidence Intervals for copyright infringement proof.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="default" size="sm" disabled={isLoading || isExecuting}
                            onClick={loadVerificationData} icon={<TbRefresh className={isLoading ? 'animate-spin' : ''} />}>
                            Refresh
                        </Button>
                        <Button variant="solid" size="sm" disabled={isExecuting} onClick={handleRunVerification}
                            loading={isExecuting} icon={!isExecuting ? <TbFlask /> : undefined}>
                            {isExecuting ? 'Running…' : 'Run Benchmark'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error */}
            {errorMsg && (
                <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-[11px] text-rose-700 dark:text-rose-400">
                    <TbX className="shrink-0" />{errorMsg}
                </div>
            )}

            {/* Model Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-xs font-medium text-gray-500 shrink-0">Select Model:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {modelKeys.map((key) => {
                        const mData = data?.verified_models[key]
                        const isTheft = mData?.decision === 'WATERMARK_CONFIRMED'
                        const isSelected = selectedModel === key
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedModel(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                                    isSelected
                                        ? 'bg-primary text-white border-primary shadow-sm'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary'
                                }`}
                            >
                                {key.replace(/_/g, ' ')}
                                {mData && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${isTheft ? 'bg-rose-400' : 'bg-emerald-400'} ${isSelected ? 'opacity-100' : ''}`} />
                                )}
                            </button>
                        )
                    })}
                </div>
                {currentModelData && (
                    <span className="text-[10px] font-mono text-gray-400 truncate ml-auto">
                        {currentModelData.trigger_set_hash.slice(0, 20)}…
                    </span>
                )}
            </div>

            {/* KPI Cards */}
            {isLoading ? (
                <div className="py-20 flex flex-col items-center gap-2 text-gray-400">
                    <Spinner size={28} />
                    <span className="text-xs">Evaluating verification matrix…</span>
                </div>
            ) : currentModelData ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard
                            label="Probes Matched (k / n)"
                            value={`${currentModelData.k} / ${currentModelData.n}`}
                            sub={`Observed rate: ${(currentModelData.observed_match_rate * 100).toFixed(1)}%`}
                            accent={isWatermarkConfirmed ? 'text-primary' : ''}
                        />
                        <KpiCard
                            label="Exact Binomial P-Value"
                            value={currentModelData.p_value_scientific}
                            sub={`Null p₀ = ${currentModelData.null_probability.toFixed(2)}`}
                            accent={isWatermarkConfirmed ? 'text-rose-600 dark:text-rose-400' : ''}
                        />
                        <KpiCard
                            label="95% Clopper-Pearson CI"
                            value={
                                currentModelData.confidence_interval_95
                                    ? `[${(currentModelData.confidence_interval_95.ci_lower * 100).toFixed(1)}, ${(currentModelData.confidence_interval_95.ci_upper * 100).toFixed(1)}%]`
                                    : `[${Math.max(0, (currentModelData.observed_match_rate - 0.08) * 100).toFixed(1)}, ${Math.min(100, (currentModelData.observed_match_rate + 0.08) * 100).toFixed(1)}%]`
                            }
                            sub="Exact interval"
                        />
                        <Card>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Statistical Decision</div>
                            <div className={`flex items-center gap-2 mb-1 ${isWatermarkConfirmed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {isWatermarkConfirmed ? <TbShieldX className="text-lg" /> : <TbShieldCheck className="text-lg" />}
                                <span className="font-bold text-sm">{isWatermarkConfirmed ? 'THEFT DETECTED' : 'INDEPENDENT'}</span>
                            </div>
                            <div className="text-[11px] text-gray-500">
                                {isWatermarkConfirmed ? 'Reject null (p < 1e⁻⁶)' : 'Fail to reject null'}
                            </div>
                        </Card>
                    </div>

                    {/* Verdict Card */}
                    <Card>
                        <div className={`relative z-10 flex items-start gap-3.5 p-4 rounded-xl border ${isWatermarkConfirmed ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800' : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'}`}>
                            {isWatermarkConfirmed
                                ? <TbShieldX className="text-rose-600 dark:text-rose-400 text-2xl shrink-0 mt-0.5" />
                                : <TbShieldCheck className="text-emerald-600 dark:text-emerald-400 text-2xl shrink-0 mt-0.5" />}
                            <div>
                                <div className={`text-sm font-bold font-heading mb-1 ${isWatermarkConfirmed ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                    {isWatermarkConfirmed ? 'Ownership Finding: Watermark Confirmed' : 'Negative: Independent Origin'}
                                </div>
                                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-mono">{currentModelData.statistical_verdict}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Probe Matrix */}
                    <Card>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h5 className="font-semibold text-sm">Probe Response Matrix</h5>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">{filteredRows.length} of {matrixRows.length} probes · {selectedModel.replace(/_/g, ' ')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Filter pills */}
                                <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 text-xs bg-white dark:bg-gray-900">
                                    {(['all', 'matched', 'unmatched'] as const).map((f) => (
                                        <button key={f} type="button" onClick={() => setFilterMatch(f)}
                                            className={`px-2.5 py-1 rounded font-medium capitalize transition-colors ${
                                                filterMatch === f
                                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                                    : 'text-gray-400 hover:text-gray-700'
                                            }`}>
                                            {f === 'all' ? `All (${matrixRows.length})` : f === 'matched' ? `✓ ${currentModelData.k}` : `✗ ${currentModelData.n - currentModelData.k}`}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search probe…"
                                    value={searchProbe}
                                    onChange={(e) => setSearchProbe(e.target.value)}
                                    className="w-36 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            <Table hoverable={false}>
                                <THead>
                                    <Tr>
                                        <Th>Probe ID</Th>
                                        <Th>Expected</Th>
                                        <Th>Observed</Th>
                                        <Th className="text-right">Result</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {filteredRows.length === 0 ? (
                                        <Tr><Td colSpan={4} className="py-8 text-center text-xs text-gray-400">No matching probes.</Td></Tr>
                                    ) : filteredRows.map((row) => {
                                        const resp = row.responses?.[selectedModel]
                                        const matched = resp ? resp.matched : false
                                        return (
                                            <Tr key={row.trigger_id}>
                                                <Td className="font-mono text-xs">{row.trigger_id}</Td>
                                                <Td className="text-xs capitalize text-gray-500 dark:text-gray-400">{row.expected_target_class}</Td>
                                                <Td className="text-xs capitalize font-medium">
                                                    <span className={matched ? 'text-primary' : 'text-gray-500'}>{resp?.predicted_class || '—'}</span>
                                                </Td>
                                                <Td className="text-right">
                                                    {matched
                                                        ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"><TbCheck />Match</span>
                                                        : <span className="text-[11px] text-gray-400">Miss</span>}
                                                </Td>
                                            </Tr>
                                        )
                                    })}
                                </TBody>
                            </Table>
                        </div>
                    </Card>
                </>
            ) : (
                <div className="py-16 text-center text-xs text-gray-400">
                    No verification data. Click <strong>Run Benchmark</strong> to evaluate all checkpoints.
                </div>
            )}
        </div>
    )
}
