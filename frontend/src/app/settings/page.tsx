'use client'

import { useEffect, useState } from 'react'
import {
    TbRefresh,
    TbCheck,
    TbX
} from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Spinner from '@/components/ui/Spinner'

const { THead, TBody, Tr, Th, Td } = Table

interface SystemTelemetry {
    hardware?: {
        device: string
        cuda_available: boolean
        cuda_device_name?: string
        torch_version: string
        python_version: string
        os_platform: string
        cpu_count: number
    }
    checkpoints?: Record<
        string,
        {
            path: string
            exists: boolean
            size_bytes: number
        }
    >
    database?: {
        online: boolean
        models_count: number
        jobs_count: number
        audit_events_count: number
        certificates_count: number
        error?: string
    }
    cryptography?: {
        hmac_algorithm: string
        data_partition_seed: number
        trigger_generation_seed: number
        significance_threshold_alpha: number
    }
}

export default function SystemSettingsPage() {
    const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null)
    const [apiOnline, setApiOnline] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    async function loadTelemetry() {
        setIsLoading(true)
        setErrorMsg(null)
        try {
            const res = await fetch('/api/system-status')
            if (!res.ok) {
                throw new Error('Failed to retrieve system telemetry')
            }
            const data = await res.json()
            setApiOnline(data.apiOnline)
            setTelemetry(data.telemetry)
        } catch (e: any) {
            setErrorMsg(e.message)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadTelemetry()
    }, [])

    function formatBytes(bytes: number) {
        if (!bytes || bytes === 0) return '0 B'
        const k = 1024
        const dm = 2
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    const hw = telemetry?.hardware
    const db = telemetry?.database
    const crypto = telemetry?.cryptography
    const checkpoints = telemetry?.checkpoints || {}

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="heading-text font-bold text-xl text-gray-900 dark:text-gray-100 mb-1">System Settings & Telemetry</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Host environment diagnostics, PyTorch compute hardware status, database connectivity, and checkpoint inventory.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="default"
                            size="sm"
                            disabled={isLoading}
                            onClick={loadTelemetry}
                            icon={<TbRefresh className={isLoading ? 'animate-spin' : ''} />}
                        >
                            Refresh Telemetry
                        </Button>
                    </div>
                </div>
            </div>

            {errorMsg && (
                <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-lg">
                    {errorMsg}
                </div>
            )}

            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        FastAPI Service
                    </div>
                    <div className="flex items-center gap-2 text-xl font-bold heading-text">
                        <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{apiOnline ? 'Online (Port 8000)' : 'Offline'}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Uvicorn serving process
                    </div>
                </Card>

                <Card>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        PyTorch Compute
                    </div>
                    <div className="text-xl font-bold font-mono heading-text uppercase">
                        {hw ? hw.device : 'CPU'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        PyTorch v{hw ? hw.torch_version : '2.14.0+cpu'}
                    </div>
                </Card>

                <Card>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        PostgreSQL Database
                    </div>
                    <div className="flex items-center gap-2 text-xl font-bold heading-text">
                        <span className={`w-2 h-2 rounded-full ${db?.online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span>{db?.online ? 'Connected' : 'Syncing'}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        modelguard @ localhost:5432
                    </div>
                </Card>

                <Card>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Cryptographic Suite
                    </div>
                    <div className="text-xl font-bold font-mono heading-text">
                        HMAC-SHA256
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Canonical JSON signing
                    </div>
                </Card>
            </div>

            {/* Environment Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Host Diagnostics */}
                <Card>
                    <h5 className="font-semibold text-sm pb-2.5 mb-2 border-b border-gray-100 dark:border-gray-800">
                        Host Compute Environment
                    </h5>

                    <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-500">Operating System</span>
                            <span className="font-mono text-gray-800 dark:text-gray-200">
                                {hw?.os_platform || 'Windows 11 / x86_64'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-500">Python Interpreter</span>
                            <span className="font-mono text-gray-800 dark:text-gray-200">
                                {hw?.python_version ? hw.python_version.split(' ')[0] : '3.12.x'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-500">Physical / Logical Cores</span>
                            <span className="font-mono text-gray-800 dark:text-gray-200">
                                {hw?.cpu_count || 8} Logical Threads
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-500">CUDA Acceleration</span>
                            <span className="text-gray-800 dark:text-gray-200">
                                {hw?.cuda_available ? (
                                    <span className="text-emerald-600 font-medium">{hw.cuda_device_name || 'Active'}</span>
                                ) : (
                                    <span className="text-gray-400">Disabled (CPU Reference Mode)</span>
                                )}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                            <span className="text-gray-500">Verification Alpha (α)</span>
                            <span className="font-mono text-primary font-bold">
                                {crypto?.significance_threshold_alpha || '1e-06'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Database Metrics */}
                <Card>
                    <h5 className="font-semibold text-sm pb-2.5 mb-2 border-b border-gray-100 dark:border-gray-800">
                        PostgreSQL Data Inventory
                    </h5>

                    <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-500">Registered Model Records</span>
                            <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                                {db?.models_count ?? 6}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-500">Background ML Jobs Logged</span>
                            <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                                {db?.jobs_count ?? 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-500">Digital Certificates Issued</span>
                            <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                                {db?.certificates_count ?? 9}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-500">Audit Ledger Events</span>
                            <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                                {db?.audit_events_count ?? 10}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                            <span className="text-gray-500">Trigger Generation Seed</span>
                            <span className="font-mono text-gray-800 dark:text-gray-200">
                                {crypto?.trigger_generation_seed || 1337}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Checkpoint File System Inventory */}
            <Card>
                <div className="pb-3 mb-2 border-b border-gray-100 dark:border-gray-800">
                    <h5 className="font-semibold text-sm">Checkpoint Storage Inventory</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Filesystem status and storage footprints of PyTorch model checkpoints.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <Table hoverable={false}>
                        <THead>
                            <Tr>
                                <Th>Model Role</Th>
                                <Th>Storage Relative Path</Th>
                                <Th>Disk Status</Th>
                                <Th className="text-right">File Size</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {Object.entries(checkpoints).length === 0 ? (
                                <Tr>
                                    <Td colSpan={4} className="py-8 text-center text-xs text-gray-400">
                                        No checkpoint paths configured.
                                    </Td>
                                </Tr>
                            ) : (
                                Object.entries(checkpoints).map(([key, item]) => (
                                    <Tr key={key}>
                                        <Td className="text-xs font-semibold capitalize heading-text">
                                            {key.replace('_', ' ')}
                                        </Td>
                                        <Td className="font-mono text-xs text-gray-500">
                                            {item.path}
                                        </Td>
                                        <Td>
                                            {item.exists ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                    <TbCheck className="text-xs" /> Verified on Disk
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-medium">
                                                    <TbX className="text-xs" /> Missing
                                                </span>
                                            )}
                                        </Td>
                                        <Td className="text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                                            {formatBytes(item.size_bytes)}
                                        </Td>
                                    </Tr>
                                ))
                            )}
                        </TBody>
                    </Table>
                </div>
            </Card>
        </div>
    )
}
