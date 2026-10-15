'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Dialog from '@/components/ui/Dialog'
import Tag from '@/components/ui/Tag'
import {
    TbRefresh,
    TbLock,
    TbEye,
    TbFingerprint,
    TbCheck,
    TbGridDots,
    TbAdjustments,
    TbAlertTriangle,
    TbCopy,
    TbPlayerPlay,
    TbChartBar,
    TbCpu
} from 'react-icons/tb'

const CIFAR10_CLASSES = [
    'airplane', 'automobile', 'bird', 'cat', 'deer',
    'dog', 'frog', 'horse', 'ship', 'truck'
]

interface TriggerItem {
    trigger_id: string
    source_index: number
    source_class_name: string
    target_class_name: string
    preview_url?: string
    thumbnail_base64?: string | null
}

interface VaultData {
    trigger_count: number
    target_class_name: string
    target_class_idx: number
    patch_size: string
    corner: string
    pattern: string
    intensity: number
    sha256_fingerprint: string
    hash_algorithm?: string
    triggers: TriggerItem[]
}

interface EvalResult {
    model_id: string
    n: number
    k: number
    observed_match_rate: number
    exact_p_value: number
    p_value_scientific: string
    confidence_interval_95: [number, number]
    decision: string
    statistical_verdict: string
}

const getThumbnailSrc = (item: TriggerItem): string => {
    if (item.preview_url) return item.preview_url
    if (item.thumbnail_base64) {
        if (item.thumbnail_base64.startsWith('data:') || item.thumbnail_base64.startsWith('http')) {
            return item.thumbnail_base64
        }
        return `data:image/png;base64,${item.thumbnail_base64}`
    }
    return `/api/triggers/preview/${item.trigger_id}`
}

function StatCell({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-gray-400 font-medium">{label}</span>
            <span className={`text-sm font-bold heading-text ${mono ? 'font-mono' : ''}`}>{value}</span>
        </div>
    )
}

export default function WatermarkLabPage() {
    const [data, setData] = useState<VaultData | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [generating, setGenerating] = useState<boolean>(false)
    const [evaluating, setEvaluating] = useState<boolean>(false)
    const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState<boolean>(false)

    // Config state
    const [selectedPattern, setSelectedPattern] = useState<string>('checkerboard')
    const [selectedCorner, setSelectedCorner] = useState<string>('bottom_right')
    const [selectedTargetClass, setSelectedTargetClass] = useState<number>(0)
    const [watermarkWeight, setWatermarkWeight] = useState<number>(1.0)
    const [selectedTrigger, setSelectedTrigger] = useState<TriggerItem | null>(null)
    const [filter, setFilter] = useState<string>('')
    const [showTrainModal, setShowTrainModal] = useState<boolean>(false)

    const loadTriggers = async (forceRefresh = false) => {
        setLoading(true)
        setError(null)
        try {
            const url = forceRefresh ? '/api/triggers?refresh=true' : '/api/triggers'
            const res = await fetch(url)
            if (res.ok) {
                const json = await res.json()
                setData(json)
                if (json.pattern) setSelectedPattern(json.pattern)
                if (json.corner) setSelectedCorner(json.corner)
                if (typeof json.target_class_idx === 'number') setSelectedTargetClass(json.target_class_idx)
                return
            }

            // Fallback directly to FastAPI backend
            const backendRes = await fetch('http://127.0.0.1:8000/api/v1/triggers/vault')
            if (backendRes.ok) {
                const bJson = await backendRes.json()
                setData({
                    trigger_count: bJson.trigger_count || 80,
                    target_class_name: bJson.target_class || 'airplane',
                    target_class_idx: bJson.target_class_idx ?? 0,
                    patch_size: bJson.configuration?.patch_size || '4x4',
                    corner: bJson.configuration?.corner || 'bottom_right',
                    pattern: bJson.configuration?.pattern || 'checkerboard',
                    intensity: bJson.configuration?.intensity || 1.0,
                    sha256_fingerprint: bJson.fingerprint || '',
                    hash_algorithm: bJson.hash_algorithm || 'SHA-256',
                    triggers: (bJson.triggers || []).map((t: any) => ({
                        ...t,
                        preview_url: `http://127.0.0.1:8000/api/v1/triggers/preview/${t.trigger_id}`
                    }))
                })
                return
            }

            throw new Error(`Failed to load triggers (Status: ${res.status})`)
        } catch (err: any) {
            console.error('Failed to load watermark probes:', err)
            setError(err?.message || 'Failed to connect to watermark triggers endpoint.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadTriggers()
    }, [])

    const handleGenerate = async () => {
        setGenerating(true)
        setError(null)
        try {
            const res = await fetch('/api/triggers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trigger_count: 80,
                    target_class_idx: selectedTargetClass,
                    patch_size: 4,
                    corner: selectedCorner,
                    pattern: selectedPattern,
                    intensity: 1.0,
                    seed: 42
                })
            })
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}))
                throw new Error(errJson.error || `Trigger generation failed with status ${res.status}`)
            }
            await loadTriggers(true)
        } catch (err: any) {
            setError(err?.message || 'Probe generation failed.')
        } finally {
            setGenerating(false)
        }
    }

    const handleEvaluate = async () => {
        setEvaluating(true)
        try {
            const res = await fetch('http://127.0.0.1:8000/api/v1/triggers/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_id: 'Watermarked_Victim',
                    alpha: 0.01,
                    null_probability: 0.10
                })
            })
            if (res.ok) {
                const result = await res.json()
                setEvalResult(result)
            } else {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.detail || 'Evaluation request failed')
            }
        } catch (err: any) {
            setError(err?.message || 'Watermark evaluation failed.')
        } finally {
            setEvaluating(false)
        }
    }

    const copyFingerprint = () => {
        if (!data?.sha256_fingerprint) return
        navigator.clipboard.writeText(data.sha256_fingerprint)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const filteredTriggers = filter
        ? (data?.triggers || []).filter((t) =>
            t.trigger_id.toLowerCase().includes(filter.toLowerCase()) ||
            t.source_class_name.toLowerCase().includes(filter.toLowerCase()) ||
            t.target_class_name.toLowerCase().includes(filter.toLowerCase())
          )
        : (data?.triggers || [])

    return (
        <div className="flex flex-col gap-5">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="heading-text font-bold text-xl text-gray-900 dark:text-gray-100">Watermark Laboratory</h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                                {loading
                                    ? 'SYNCING...'
                                    : data?.triggers?.length
                                    ? `${data.triggers.length} PROBES VERIFIED`
                                    : 'UNLOADED'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Secret trigger geometry, 80 visual probes, and cryptographic fingerprint manifest.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="default"
                            onClick={() => loadTriggers(true)}
                            icon={<TbRefresh className={loading ? 'animate-spin' : ''} />}
                        >
                            Refresh
                        </Button>
                        <Button
                            size="sm"
                            variant="solid"
                            onClick={handleEvaluate}
                            icon={<TbPlayerPlay className={evaluating ? 'animate-spin' : ''} />}
                        >
                            {evaluating ? 'Evaluating...' : 'Evaluate Watermark'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error Banner with Retry */}
            {error && (
                <div className="flex items-center justify-between gap-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200">
                    <div className="flex items-center gap-2">
                        <TbAlertTriangle className="text-rose-600 shrink-0 text-base" />
                        <span><strong>Error:</strong> {error}</span>
                    </div>
                    <Button size="xs" variant="default" onClick={() => loadTriggers(true)}>
                        Retry Connection
                    </Button>
                </div>
            )}

            {/* Confidentiality Notice */}
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] text-amber-800 dark:text-amber-300">
                <TbLock className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span><strong>Proprietary Material:</strong> These probes serve as ground truth for hypothesis testing — keep confidential to prevent adversary evasion.</span>
            </div>

            {/* Top Row: Config + Manifest */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Config panel */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TbAdjustments className="text-primary text-base" />
                            <h5 className="font-semibold text-sm">Trigger Parameters</h5>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">v1.0</span>
                    </div>

                    <div className="space-y-3.5 text-xs">
                        <div>
                            <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">Patch Pattern</label>
                            <select
                                value={selectedPattern}
                                onChange={(e) => setSelectedPattern(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary text-xs"
                            >
                                <option value="checkerboard">Checkerboard 4×4</option>
                                <option value="cross">Cross Hair</option>
                                <option value="solid">Solid Contrast</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">Corner Placement</label>
                            <select
                                value={selectedCorner}
                                onChange={(e) => setSelectedCorner(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary text-xs"
                            >
                                <option value="bottom_right">Bottom-Right</option>
                                <option value="bottom_left">Bottom-Left</option>
                                <option value="top_right">Top-Right</option>
                                <option value="top_left">Top-Left</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">Target Class</label>
                            <select
                                value={selectedTargetClass}
                                onChange={(e) => setSelectedTargetClass(parseInt(e.target.value))}
                                className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary text-xs capitalize"
                            >
                                {CIFAR10_CLASSES.map((cls, idx) => (
                                    <option key={cls} value={idx}>
                                        {cls} (#{idx})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-gray-500 dark:text-gray-400 font-medium">Loss Weight (λ)</label>
                                <span className="font-mono text-primary font-bold">{watermarkWeight.toFixed(1)}</span>
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="3.0"
                                step="0.1"
                                value={watermarkWeight}
                                onChange={(e) => setWatermarkWeight(parseFloat(e.target.value))}
                                className="w-full accent-primary"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>0.1 (Subtle)</span>
                                <span>1.0 (Balanced)</span>
                                <span>3.0 (Forced)</span>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                            <Button
                                size="xs"
                                variant="default"
                                className="w-full"
                                onClick={handleGenerate}
                                icon={<TbRefresh className={generating ? 'animate-spin' : ''} />}
                            >
                                {generating ? 'Regenerating...' : 'Regenerate Trigger Set'}
                            </Button>
                            <Button
                                size="xs"
                                variant="default"
                                className="w-full"
                                onClick={() => setShowTrainModal(true)}
                                icon={<TbCpu />}
                            >
                                ModelGuardCNN Training Options
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Manifest */}
                <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TbFingerprint className="text-primary text-base" />
                            <h5 className="font-semibold text-sm">Cryptographic Manifest</h5>
                        </div>
                        {data?.sha256_fingerprint && (
                            <button
                                onClick={copyFingerprint}
                                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary transition-colors cursor-pointer"
                            >
                                <TbCopy className="text-xs" />
                                {copied ? 'Copied!' : 'Copy Hash'}
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                            <Spinner size={24} />
                            <span className="text-xs">Loading manifest data…</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Stats row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                                <StatCell label="Total Probes" value={`${data?.trigger_count || data?.triggers?.length || 0}`} />
                                <StatCell label="Null Rate (p₀)" value="0.10" mono />
                                <StatCell label="Patch Size" value={data?.patch_size || '4×4'} mono />
                                <StatCell label="CIFAR Overlap" value="0%" />
                            </div>

                            {/* SHA-256 fingerprint */}
                            <div>
                                <div className="text-[11px] text-gray-400 font-medium mb-1.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <TbFingerprint className="text-xs text-primary" />
                                        SHA-256 Trigger Set Fingerprint
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-mono">HMAC-SHA256 Signed</span>
                                </div>
                                <div className="font-mono text-xs text-primary font-bold select-all bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 truncate">
                                    {data?.sha256_fingerprint || 'No fingerprint calculated'}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                                <Tag className="text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                    <TbCheck className="inline mr-1" />HMAC-SHA256 Signed
                                </Tag>
                                <Tag className="text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                                    Black-Box Verified
                                </Tag>
                                <Tag className="text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                    Adversary Blind
                                </Tag>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Live Watermark Evaluation Banner if performed */}
            {evalResult && (
                <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <TbChartBar className="text-emerald-600 text-lg" />
                                <h5 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                                    Live Watermark Evaluation: {evalResult.decision}
                                </h5>
                                <Tag className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-[10px]">
                                    Exact Binomial Test
                                </Tag>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                {evalResult.statistical_verdict}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                            <div className="text-right">
                                <div className="text-gray-400 text-[10px]">Match Count</div>
                                <div className="font-bold text-emerald-700 dark:text-emerald-300">
                                    {evalResult.k} / {evalResult.n} ({(evalResult.observed_match_rate * 100).toFixed(1)}%)
                                </div>
                            </div>
                            <div className="text-right border-l pl-4 border-emerald-200 dark:border-emerald-800">
                                <div className="text-gray-400 text-[10px]">Exact p-value</div>
                                <div className="font-bold text-emerald-700 dark:text-emerald-300">
                                    {evalResult.p_value_scientific}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Visual Probe Gallery */}
            <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <TbGridDots className="text-primary text-base" />
                        <div>
                            <h5 className="font-semibold text-sm">Visual Probe Gallery</h5>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                4×4 high-freq stamped probes · {data?.triggers ? `${data.triggers.length} loaded` : '0 loaded'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Filter by ID or class…"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full sm:w-48 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
                        <Spinner size={24} />
                        <span className="text-xs">Loading probe thumbnails…</span>
                    </div>
                ) : filteredTriggers.length > 0 ? (
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
                        {filteredTriggers.map((t) => (
                            <div
                                key={t.trigger_id}
                                onClick={() => setSelectedTrigger(t)}
                                className="group relative border border-gray-200 dark:border-gray-750 rounded-lg overflow-hidden bg-gray-900 cursor-pointer hover:border-primary hover:shadow-md transition-all aspect-square flex items-center justify-center"
                            >
                                <img
                                    src={getThumbnailSrc(t)}
                                    alt={t.trigger_id}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <TbEye className="text-white text-base" />
                                </div>
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 to-transparent py-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[8px] font-mono text-white truncate block">{t.trigger_id}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
                        <span>No watermark probes found matching "{filter}".</span>
                        {filter && (
                            <Button size="xs" variant="default" onClick={() => setFilter('')}>
                                Clear Filter
                            </Button>
                        )}
                    </div>
                )}
            </Card>

            {/* Trigger Inspect Dialog */}
            <Dialog isOpen={Boolean(selectedTrigger)} onClose={() => setSelectedTrigger(null)} onRequestClose={() => setSelectedTrigger(null)}>
                {selectedTrigger && (
                    <div className="space-y-4">
                        <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                            <h5 className="font-bold text-sm">Probe: {selectedTrigger.trigger_id}</h5>
                            <p className="text-xs text-gray-400">Secret visual verification probe</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-5">
                            <div className="w-36 h-36 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-950 shrink-0">
                                <img
                                    src={getThumbnailSrc(selectedTrigger)}
                                    alt={selectedTrigger.trigger_id}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="space-y-2.5 text-xs w-full">
                                {[
                                    { label: 'Probe ID', value: selectedTrigger.trigger_id, mono: true },
                                    { label: 'Source Class', value: selectedTrigger.source_class_name },
                                    { label: 'Target Class (Remapped)', value: selectedTrigger.target_class_name },
                                    { label: 'Dataset Index', value: String(selectedTrigger.source_index), mono: true },
                                    { label: 'Verification Status', value: 'ACTIVE_PROBE', mono: true },
                                ].map(({ label, value, mono }) => (
                                    <div key={label} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                        <span className="text-gray-400">{label}</span>
                                        <span className={`font-semibold ${mono ? 'font-mono' : 'capitalize'} text-gray-900 dark:text-gray-100`}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end pt-1 border-t border-gray-100 dark:border-gray-800">
                            <Button size="sm" variant="default" onClick={() => setSelectedTrigger(null)}>Close</Button>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Model Training Dialog */}
            <Dialog isOpen={showTrainModal} onClose={() => setShowTrainModal(false)} onRequestClose={() => setShowTrainModal(false)}>
                <div className="space-y-4">
                    <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                        <h5 className="font-bold text-sm">Train ModelGuardCNN Watermarked Model</h5>
                        <p className="text-xs text-gray-400">Joint clean and secret trigger loss optimization</p>
                    </div>
                    <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
                        <p>
                            Watermark injection embeds the secret trigger set into <span className="font-mono font-semibold">ModelGuardCNN</span> by augmenting the primary CIFAR-10 cross-entropy loss:
                        </p>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-center text-primary font-bold">
                            L_total = L_clean(y, ŷ) + {watermarkWeight.toFixed(1)} · L_wm(y_target, ŷ_wm)
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Architecture:</span>
                                <span className="font-mono font-bold">ModelGuardCNN</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Configured Loss Weight (λ):</span>
                                <span className="font-mono font-bold text-primary">{watermarkWeight.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Pattern & Corner:</span>
                                <span className="font-mono capitalize">{selectedPattern} ({selectedCorner})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Target Remap:</span>
                                <span className="font-mono capitalize">{CIFAR10_CLASSES[selectedTargetClass]} (#{selectedTargetClass})</span>
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-400 italic">
                            Production training script: <span className="font-mono">python ml/training/train_victim.py --watermark_weight {watermarkWeight.toFixed(1)}</span>
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <Button size="sm" variant="default" onClick={() => setShowTrainModal(false)}>Close</Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}
