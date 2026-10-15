'use client'

import React, { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Table from '@/components/ui/Table'
import Spinner from '@/components/ui/Spinner'
import Dialog from '@/components/ui/Dialog'
import {
    TbPlus,
    TbRefresh,
    TbSearch,
    TbCheck,
    TbHash,
    TbCpu,
    TbDatabaseImport
} from 'react-icons/tb'

const { THead, TBody, Tr, Th, Td } = Table

interface ModelRecord {
    model_id: string
    display_name?: string
    model_role: string
    architecture: string
    version: string
    checkpoint_path: string
    sha256_hash?: string
    clean_test_accuracy?: number | null
    is_watermarked: boolean
    parameter_count?: number
    inference_latency_ms?: number
    lifecycle_status?: string
    dataset_version?: string
    created_at?: string
}

export default function ModelRegistryPage() {
    const [models, setModels] = useState<ModelRecord[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isSyncing, setIsSyncing] = useState<boolean>(false)
    const [selectedRole, setSelectedRole] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [selectedModel, setSelectedModel] = useState<ModelRecord | null>(null)
    const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false)
    const [registerForm, setRegisterForm] = useState({
        model_id: '',
        display_name: '',
        model_role: 'victim',
        architecture: 'ModelGuardCNN',
        version: '1.0.0',
        checkpoint_path: 'artifacts/models/watermarked_victim/best.pt',
        is_watermarked: true,
        dataset_version: 'CIFAR-10_v1'
    })
    const [registerError, setRegisterError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    const fetchModels = async () => {
        setIsLoading(true)
        try {
            const roleParam = selectedRole !== 'all' ? `?role=${selectedRole}` : ''
            const res = await fetch(`/api/models${roleParam}`)
            if (res.ok) {
                const data = await res.json()
                setModels(Array.isArray(data) ? data : [])
            }
        } catch (err) {
            console.error('Failed to load models:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSyncArtifacts = async () => {
        setIsSyncing(true)
        try {
            const res = await fetch('http://127.0.0.1:8000/api/v1/models/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            })
            if (res.ok) {
                await fetchModels()
            }
        } catch (err) {
            console.error('Failed to sync model artifacts:', err)
        } finally {
            setIsSyncing(false)
        }
    }

    useEffect(() => {
        fetchModels()
    }, [selectedRole])

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setRegisterError(null)
        try {
            const res = await fetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerForm)
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.detail || data.error || 'Failed to register model')
            }
            setShowRegisterModal(false)
            fetchModels()
        } catch (err: any) {
            setRegisterError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const filteredModels = models.filter((m) => {
        const query = searchQuery.toLowerCase()
        return (
            m.model_id.toLowerCase().includes(query) ||
            m.architecture.toLowerCase().includes(query) ||
            (m.display_name && m.display_name.toLowerCase().includes(query))
        )
    })

    const getRoleBadge = (role: string) => {
        switch (role.toLowerCase()) {
            case 'victim':
                return <span className="text-xs font-medium text-primary">Victim (Watermarked)</span>
            case 'baseline':
                return <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Baseline Control</span>
            case 'thief':
                return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Thief Substitute</span>
            case 'adaptive':
                return <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Adaptive Evasion</span>
            default:
                return <span className="text-xs font-medium text-gray-500 capitalize">{role}</span>
        }
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="heading-text font-bold text-xl text-gray-900 dark:text-gray-100">Model Registry</h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                                4 CHECKPOINTS SYNCHRONIZED
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Neural network checkpoints with SHA-256 fingerprints, architectural metadata, and test set accuracy.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="default"
                            onClick={handleSyncArtifacts}
                            loading={isSyncing}
                            icon={<TbDatabaseImport />}
                        >
                            Sync Disk Artifacts
                        </Button>
                        <Button
                            size="sm"
                            variant="default"
                            onClick={fetchModels}
                            icon={<TbRefresh className={isLoading ? 'animate-spin' : ''} />}
                        >
                            Refresh
                        </Button>
                        <Button
                            size="sm"
                            variant="solid"
                            onClick={() => setShowRegisterModal(true)}
                            icon={<TbPlus />}
                        >
                            Register Checkpoint
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-gray-50/70 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                    {['all', 'victim', 'baseline', 'thief', 'adaptive'].map((role) => (
                        <button
                            key={role}
                            onClick={() => setSelectedRole(role)}
                            className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                                selectedRole === role
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs border border-gray-200 dark:border-gray-600'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                        >
                            {role === 'all' ? 'All Roles' : role}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-64">
                    <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        placeholder="Search models..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            {/* Models Table View */}
            <Card>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 space-y-2">
                        <Spinner size={24} />
                        <span className="text-xs">Loading neural network checkpoints...</span>
                    </div>
                ) : filteredModels.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-xs">
                        No models found matching the search criteria.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table hoverable={false}>
                            <THead>
                                <Tr>
                                    <Th>Model Identifier</Th>
                                    <Th>Architecture</Th>
                                    <Th>Role</Th>
                                    <Th className="text-right">Parameters</Th>
                                    <Th className="text-right">Clean Test Acc</Th>
                                    <Th>Watermark</Th>
                                    <Th className="text-right">Action</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {filteredModels.map((m) => (
                                    <Tr key={m.model_id}>
                                        <Td>
                                            <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                                                {m.display_name || m.model_id}
                                            </div>
                                            <div className="text-[11px] font-mono text-gray-400">
                                                {m.model_id} • v{m.version}
                                            </div>
                                        </Td>
                                        <Td className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                            {m.architecture}
                                        </Td>
                                        <Td>{getRoleBadge(m.model_role)}</Td>
                                        <Td className="font-mono text-xs text-right text-gray-600 dark:text-gray-400">
                                            {m.parameter_count ? `${(m.parameter_count / 1e3).toFixed(0)}K` : '—'}
                                        </Td>
                                        <Td className="font-mono text-xs text-right font-medium">
                                            {m.clean_test_accuracy != null
                                                ? `${(m.clean_test_accuracy * 100).toFixed(1)}%`
                                                : '—'}
                                        </Td>
                                        <Td>
                                            {m.is_watermarked ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                                                    <TbCheck className="text-xs" /> Embedded
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">Untagged</span>
                                            )}
                                        </Td>
                                        <Td className="text-right">
                                            <Button
                                                size="xs"
                                                variant="default"
                                                onClick={() => setSelectedModel(m)}
                                            >
                                                Inspect
                                            </Button>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                )}
            </Card>

            {/* Model Inspect Dialog */}
            <Dialog
                isOpen={Boolean(selectedModel)}
                onClose={() => setSelectedModel(null)}
                onRequestClose={() => setSelectedModel(null)}
            >
                {selectedModel && (
                    <div className="space-y-4">
                        <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                            <h5 className="font-bold text-sm">
                                {selectedModel.display_name || selectedModel.model_id}
                            </h5>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                                {selectedModel.architecture} • v{selectedModel.version}
                            </p>
                        </div>
                        <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-400">Assigned Role</span>
                                <span className="font-semibold capitalize text-gray-800 dark:text-gray-200">
                                    {selectedModel.model_role}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-400">Dataset Partition</span>
                                <span className="text-gray-800 dark:text-gray-200 font-mono">
                                    {selectedModel.dataset_version || 'CIFAR-10_v1'}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-400">Clean Test Accuracy</span>
                                <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                                    {selectedModel.clean_test_accuracy != null
                                        ? `${(selectedModel.clean_test_accuracy * 100).toFixed(2)}%`
                                        : 'Not Evaluated'}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-400">Watermark Status</span>
                                <span className={selectedModel.is_watermarked ? 'text-primary font-medium' : 'text-gray-400'}>
                                    {selectedModel.is_watermarked ? 'Embedded (80 secret triggers)' : 'Untagged'}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-400">Parameters</span>
                                <span className="font-mono text-gray-800 dark:text-gray-200">
                                    {selectedModel.parameter_count?.toLocaleString() || '—'}
                                </span>
                            </div>
                            <div className="py-1 border-b border-gray-100 dark:border-gray-800">
                                <div className="text-gray-400 mb-1">SHA-256 Digest</div>
                                <div className="font-mono text-[11px] text-gray-700 dark:text-gray-300 break-all select-all bg-gray-50 dark:bg-gray-800/60 p-2 rounded-md">
                                    {selectedModel.sha256_hash || 'Verified'}
                                </div>
                            </div>
                            <div className="py-1">
                                <div className="text-gray-400 mb-1">Checkpoint Path</div>
                                <div className="font-mono text-[11px] text-gray-500 break-all bg-gray-50 dark:bg-gray-800/60 p-2 rounded-md">
                                    {selectedModel.checkpoint_path}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button size="sm" variant="default" onClick={() => setSelectedModel(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Register Checkpoint Dialog */}
            <Dialog
                isOpen={showRegisterModal}
                onClose={() => setShowRegisterModal(false)}
                onRequestClose={() => setShowRegisterModal(false)}
            >
                <div className="space-y-4">
                    <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                        <h5 className="font-bold text-sm">Register Model Checkpoint</h5>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Connect an existing serialized PyTorch checkpoint to the registry.
                        </p>
                    </div>
                    {registerError && (
                        <div className="p-2.5 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-lg">
                            {registerError}
                        </div>
                    )}
                    <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                        <div>
                            <label className="block text-gray-600 dark:text-gray-400 mb-1 font-medium">Model Identifier</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. ResNet18_Victim"
                                value={registerForm.model_id}
                                onChange={(e) => setRegisterForm({ ...registerForm, model_id: e.target.value })}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-gray-600 dark:text-gray-400 mb-1 font-medium">Architecture</label>
                                <select
                                    value={registerForm.architecture}
                                    onChange={(e) => setRegisterForm({ ...registerForm, architecture: e.target.value })}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary"
                                >
                                    <option value="ModelGuardCNN">ModelGuardCNN</option>
                                    <option value="BaselineCNN">BaselineCNN</option>
                                    <option value="ThiefCNN">ThiefCNN</option>
                                    <option value="ResNet18CIFAR">ResNet18CIFAR</option>
                                    <option value="MobileNetV2CIFAR">MobileNetV2CIFAR</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-600 dark:text-gray-400 mb-1 font-medium">Role</label>
                                <select
                                    value={registerForm.model_role}
                                    onChange={(e) => setRegisterForm({ ...registerForm, model_role: e.target.value })}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary"
                                >
                                    <option value="victim">Victim (Watermarked)</option>
                                    <option value="baseline">Baseline Control</option>
                                    <option value="thief">Thief Substitute</option>
                                    <option value="adaptive">Adaptive Evasion</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-600 dark:text-gray-400 mb-1 font-medium">Checkpoint Relative Path</label>
                            <input
                                type="text"
                                required
                                placeholder="artifacts/models/watermarked_victim/best.pt"
                                value={registerForm.checkpoint_path}
                                onChange={(e) => setRegisterForm({ ...registerForm, checkpoint_path: e.target.value })}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 font-mono text-[11px] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="is_watermarked_reg"
                                checked={registerForm.is_watermarked}
                                onChange={(e) => setRegisterForm({ ...registerForm, is_watermarked: e.target.checked })}
                                className="rounded border-gray-300 text-primary focus:ring-0"
                            />
                            <label htmlFor="is_watermarked_reg" className="text-gray-600 dark:text-gray-400 cursor-pointer">
                                Embeds active watermark triggers
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <Button size="sm" variant="default" type="button" onClick={() => setShowRegisterModal(false)}>
                                Cancel
                            </Button>
                            <Button size="sm" variant="solid" type="submit" loading={isSubmitting}>
                                Register
                            </Button>
                        </div>
                    </form>
                </div>
            </Dialog>
        </div>
    )
}
