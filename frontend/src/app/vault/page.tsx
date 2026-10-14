'use client'

import { Lock, ShieldAlert, KeyRound, Fingerprint, Layers } from 'lucide-react'
import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'

interface TriggerItem {
    trigger_id: string
    source_index: number
    source_class_name: string
    target_class_name: string
    thumbnail_base64: string | null
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
    hash_algorithm: string
    triggers: TriggerItem[]
}

export default function VaultPage() {
    const [data, setData] = useState<VaultData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/triggers')
            .then((res) => res.json())
            .then((json) => {
                setData(json)
                setLoading(false)
            })
            .catch((err) => {
                console.error('Failed to load triggers:', err)
                setLoading(false)
            })
    }, [])

    return (
        <div className="space-y-6">
            {/* Prominent Secret Research Artifact Alert Banner */}
            <Alert
                type="warning"
                showIcon
                title="SECRET RESEARCH ARTIFACT · Strict Access Control"
                className="rounded-2xl"
            >
                These visual probe triggers constitute the proprietary ground truth for black-box statistical verification. 
                Never expose this probe manifest or trigger metadata through public client-facing prediction APIs.
            </Alert>

            {/* Header */}
            <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                    <Tag className="text-[10px] font-bold uppercase tracking-wider bg-warning-subtle text-warning border-warning/20">
                        Cryptographic Key Store
                    </Tag>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight heading-text flex items-center gap-2.5">
                    <Lock className="w-7 h-7 text-primary" />
                    Secret Ownership Trigger Vault
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Cryptographically signed 80-probe watermark trigger population. Every trigger stamps a high-frequency visual pattern forcing the victim to predict target class &apos;{data?.target_class_name || 'airplane'}&apos;.
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="text-center">
                    <div className="text-lg font-bold font-mono text-primary">
                        {data?.target_class_name || 'airplane'} (Class #{data?.target_class_idx ?? 0})
                    </div>
                    <div className="text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        Planted Target Label
                    </div>
                </Card>

                <Card className="text-center">
                    <div className="text-lg font-bold font-mono heading-text">
                        {data ? `${data.patch_size} ${data.corner}` : '4x4 bottom_right'}
                    </div>
                    <div className="text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        Watermark Geometry ({data?.pattern || 'checkerboard'})
                    </div>
                </Card>

                <Card className="text-center">
                    <div className="text-lg font-bold font-mono heading-text">
                        {data?.trigger_count || 80} Probes
                    </div>
                    <div className="text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        Probe Population Size
                    </div>
                </Card>

                <Card className="text-center">
                    <div className="text-xs font-mono font-bold text-success break-all px-2">
                        {data?.sha256_fingerprint ? `${data.sha256_fingerprint.slice(0, 16)}...` : 'Loading...'}
                    </div>
                    <div className="text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        SHA-256 Fingerprint
                    </div>
                </Card>
            </div>

            {/* Trigger Gallery */}
            <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h5 className="font-bold heading-text text-base flex items-center gap-2">
                            <Layers className="w-4 h-4 text-primary" />
                            Watermarked Probe Gallery ({data?.triggers.length || 0} Probes Displayed)
                        </h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Actual synthesized CIFAR-10 images stamped with localized 4x4 high-frequency micro-patterns.
                        </p>
                    </div>
                    <Tag className="font-mono text-[11px] self-start sm:self-auto bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        SHA-256: {data?.sha256_fingerprint.slice(0, 8)}...
                    </Tag>
                </div>

                <div className="pt-4">
                    {loading ? (
                        <div className="p-16 flex items-center justify-center gap-3 text-sm text-gray-500 font-mono">
                            <Spinner size={32} />
                            <span>Loading secret trigger probes from artifact vault...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {data?.triggers.map((t) => (
                                <div
                                    key={t.trigger_id}
                                    className="bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-center space-y-2 hover:border-gray-300 dark:hover:border-gray-600 transition"
                                >
                                    <div className="w-full aspect-square bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg relative overflow-hidden flex items-center justify-center">
                                        {t.thumbnail_base64 ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={t.thumbnail_base64}
                                                alt={t.trigger_id}
                                                className="w-full h-full object-cover pixelated"
                                            />
                                        ) : (
                                            <div className="w-full h-full opacity-60 bg-gray-200 dark:bg-gray-800" />
                                        )}
                                        {/* Stamp indicator badge */}
                                        <div
                                            className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-error rounded-[1px] ring-1 ring-white dark:ring-black"
                                            title="4x4 Stamp"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold heading-text font-mono">
                                            {t.trigger_id}
                                        </div>
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                                            {t.source_class_name} &rarr;
                                        </div>
                                        <div className="mt-1">
                                            <Tag className="text-[9px] px-1.5 py-0 font-mono bg-success-subtle text-success border-success/20">
                                                {t.target_class_name}
                                            </Tag>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
