'use client'

import { useEffect, useState } from 'react'
import {
    TbFileCertificate,
    TbRefresh,
    TbSearch,
    TbHistory,
    TbCheck,
    TbAlertTriangle,
    TbLockCheck
} from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'
import Dialog from '@/components/ui/Dialog'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'

const { TabList, TabNav, TabContent } = Tabs
const { THead, TBody, Tr, Th, Td } = Table

interface CertificateItem {
    certificate_id: string
    model_id: string
    trigger_set_hash: string
    trigger_count_n: number
    match_count_k: number
    observed_match_rate: number
    exact_p_value: number
    p_value_scientific: string
    statistical_decision: string
    cryptographic_signature: string
    signature_algorithm?: string
    timestamp: string
    verdict_text?: string
}

interface AuditLogItem {
    id: number
    timestamp: string
    event_type: string
    action: string
    resource_id?: string
    actor?: string
    ip_address?: string
    details?: any
}

export default function CertificatesPage() {
    const [certificates, setCertificates] = useState<CertificateItem[]>([])
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [selectedTab, setSelectedTab] = useState<string>('certificates')

    // Modal state for HMAC verification
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false)
    const [selectedCertToVerify, setSelectedCertToVerify] = useState<CertificateItem | null>(null)
    const [isVerifyingSignature, setIsVerifyingSignature] = useState<boolean>(false)
    const [verifyResult, setVerifyResult] = useState<{
        is_valid: boolean
        tampered: boolean
        message: string
        computed_signature?: string
    } | null>(null)

    async function loadData() {
        setIsLoading(true)
        try {
            const [certsRes, auditRes] = await Promise.all([
                fetch('/api/certificates'),
                fetch('/api/audit?limit=50'),
            ])

            if (certsRes.ok) {
                const cJson = await certsRes.json()
                setCertificates(cJson.certificates || [])
            }

            if (auditRes.ok) {
                const aJson = await auditRes.json()
                setAuditLogs(aJson.events || [])
            }
        } catch (e) {
            console.error('Failed to load certificates or audit trail:', e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    async function handleVerifySignature(cert: CertificateItem) {
        setSelectedCertToVerify(cert)
        setVerifyResult(null)
        setIsVerifyModalOpen(true)
        setIsVerifyingSignature(true)

        try {
            const res = await fetch('/api/verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify-signature',
                    payload: cert,
                }),
            })
            const data = await res.json()
            setVerifyResult(data)
        } catch (e: any) {
            setVerifyResult({
                is_valid: false,
                tampered: true,
                message: `Verification network error: ${e.message}`,
            })
        } finally {
            setIsVerifyingSignature(false)
        }
    }

    async function handleTamperTest() {
        if (!selectedCertToVerify) return
        setIsVerifyingSignature(true)
        try {
            const tamperedCert = {
                ...selectedCertToVerify,
                match_count_k: selectedCertToVerify.match_count_k === 80 ? 79 : 80,
            }

            const res = await fetch('/api/verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify-signature',
                    payload: tamperedCert,
                }),
            })
            const data = await res.json()
            setVerifyResult(data)
        } catch (e: any) {
            setVerifyResult({
                is_valid: false,
                tampered: true,
                message: `Tamper test error: ${e.message}`,
            })
        } finally {
            setIsVerifyingSignature(false)
        }
    }

    const filteredCerts = certificates.filter(
        (c) =>
            c.certificate_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.model_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.statistical_decision.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredAudit = auditLogs.filter(
        (a) =>
            a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.resource_id && a.resource_id.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="heading-text font-bold text-xl text-gray-900 dark:text-gray-100 mb-1">Certificates & Audit Trail</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Cryptographic ownership certificates signed with master HSM key and immutable PostgreSQL audit logs.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="default"
                            size="sm"
                            disabled={isLoading}
                            onClick={loadData}
                            icon={<TbRefresh className={isLoading ? 'animate-spin' : ''} />}
                        >
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Issued Certificates
                    </div>
                    <div className="text-2xl font-bold heading-text">
                        {certificates.length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Digitally signed certificates
                    </div>
                </Card>

                <Card>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Theft Decisions Confirmed
                    </div>
                    <div className="text-2xl font-bold heading-text text-primary">
                        {certificates.filter((c) => c.statistical_decision === 'WATERMARK_CONFIRMED').length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Infringements proven (p &lt; 1e-6)
                    </div>
                </Card>

                <Card>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Signature Algorithm
                    </div>
                    <div className="text-base font-bold font-mono heading-text mt-1">
                        HMAC-SHA256
                    </div>
                    <div className="text-xs text-gray-500 mt-1.5">
                        Canonical JSON serialization
                    </div>
                </Card>

                <Card>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Audit Events Recorded
                    </div>
                    <div className="text-2xl font-bold heading-text">
                        {auditLogs.length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        PostgreSQL immutable log
                    </div>
                </Card>
            </div>

            {/* Search Filter */}
            <div className="relative max-w-sm">
                <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search certificates or events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary"
                />
            </div>

            {/* Main Tabs */}
            <Tabs value={selectedTab} onChange={(val) => setSelectedTab(val)}>
                <TabList>
                    <TabNav value="certificates">
                        <div className="flex items-center gap-1.5 text-xs">
                            <TbFileCertificate />
                            <span>Ownership Certificates ({filteredCerts.length})</span>
                        </div>
                    </TabNav>
                    <TabNav value="audit">
                        <div className="flex items-center gap-1.5 text-xs">
                            <TbHistory />
                            <span>Audit Trail ({filteredAudit.length})</span>
                        </div>
                    </TabNav>
                </TabList>

                {/* Tab 1: Certificates */}
                <TabContent value="certificates">
                    <Card className="mt-3">
                        <div className="overflow-x-auto">
                            <Table hoverable={false}>
                                <THead>
                                    <Tr>
                                        <Th>Certificate ID</Th>
                                        <Th>Target Model</Th>
                                        <Th className="text-right">Probes Matched</Th>
                                        <Th className="text-right">Binomial P-Value</Th>
                                        <Th>Forensic Verdict</Th>
                                        <Th>HMAC Signature</Th>
                                        <Th className="text-right">Action</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {isLoading ? (
                                        <Tr>
                                            <Td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                                                Loading certificates...
                                            </Td>
                                        </Tr>
                                    ) : filteredCerts.length === 0 ? (
                                        <Tr>
                                            <Td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                                                No certificates found. Run a verification benchmark to issue certificates.
                                            </Td>
                                        </Tr>
                                    ) : (
                                        filteredCerts.map((cert) => {
                                            const isTheft = cert.statistical_decision === 'WATERMARK_CONFIRMED'
                                            return (
                                                <Tr key={cert.certificate_id}>
                                                    <Td className="font-mono text-xs font-semibold heading-text">
                                                        {cert.certificate_id}
                                                    </Td>
                                                    <Td className="text-xs capitalize font-medium">
                                                        {cert.model_id.replace('_', ' ')}
                                                    </Td>
                                                    <Td className="font-mono text-xs text-right font-medium">
                                                        {cert.match_count_k}/{cert.trigger_count_n} ({(cert.observed_match_rate * 100).toFixed(0)}%)
                                                    </Td>
                                                    <Td className="font-mono text-xs text-right text-gray-500">
                                                        {cert.p_value_scientific || cert.exact_p_value.toExponential(2)}
                                                    </Td>
                                                    <Td>
                                                        <span className={`text-xs font-medium ${isTheft ? 'text-primary' : 'text-gray-500'}`}>
                                                            {isTheft ? 'THEFT PROVEN' : 'INDEPENDENT'}
                                                        </span>
                                                    </Td>
                                                    <Td className="font-mono text-[11px] text-gray-400 max-w-[130px] truncate">
                                                        {cert.cryptographic_signature ? cert.cryptographic_signature.slice(0, 16) + '...' : 'Signed'}
                                                    </Td>
                                                    <Td className="text-right">
                                                        <Button
                                                            variant="default"
                                                            size="xs"
                                                            onClick={() => handleVerifySignature(cert)}
                                                            icon={<TbLockCheck />}
                                                        >
                                                            Verify
                                                        </Button>
                                                    </Td>
                                                </Tr>
                                            )
                                        })
                                    )}
                                </TBody>
                            </Table>
                        </div>
                    </Card>
                </TabContent>

                {/* Tab 2: Audit Trail */}
                <TabContent value="audit">
                    <Card className="mt-3">
                        <div className="overflow-x-auto">
                            <Table hoverable={false}>
                                <THead>
                                    <Tr>
                                        <Th>Timestamp</Th>
                                        <Th>Event Type</Th>
                                        <Th>Action Description</Th>
                                        <Th>Resource Target</Th>
                                        <Th className="text-right">Origin</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {isLoading ? (
                                        <Tr>
                                            <Td colSpan={5} className="py-12 text-center text-xs text-gray-400">
                                                Loading audit log records...
                                            </Td>
                                        </Tr>
                                    ) : filteredAudit.length === 0 ? (
                                        <Tr>
                                            <Td colSpan={5} className="py-12 text-center text-xs text-gray-400">
                                                No audit events recorded yet.
                                            </Td>
                                        </Tr>
                                    ) : (
                                        filteredAudit.map((item) => (
                                            <Tr key={item.id}>
                                                <Td className="font-mono text-xs text-gray-500 whitespace-nowrap">
                                                    {new Date(item.timestamp).toLocaleString()}
                                                </Td>
                                                <Td className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                    {item.event_type}
                                                </Td>
                                                <Td className="text-xs text-gray-800 dark:text-gray-200">
                                                    {item.action}
                                                </Td>
                                                <Td className="font-mono text-xs text-gray-500">
                                                    {item.resource_id || 'System'}
                                                </Td>
                                                <Td className="text-right font-mono text-xs text-gray-400">
                                                    {item.ip_address || '127.0.0.1'}
                                                </Td>
                                            </Tr>
                                        ))
                                    )}
                                </TBody>
                            </Table>
                        </div>
                    </Card>
                </TabContent>
            </Tabs>

            {/* Cryptographic Signature Verification Dialog */}
            <Dialog
                isOpen={isVerifyModalOpen}
                onClose={() => setIsVerifyModalOpen(false)}
                onRequestClose={() => setIsVerifyModalOpen(false)}
                width={560}
            >
                <div className="space-y-4">
                    <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                        <h5 className="font-bold text-sm">
                            HMAC-SHA256 Signature Verification
                        </h5>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Validates mathematical integrity against server master key.
                        </p>
                    </div>

                    {selectedCertToVerify && (
                        <div className="space-y-3 text-xs">
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl space-y-1.5 font-mono">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Certificate ID:</span>
                                    <span className="font-bold heading-text">{selectedCertToVerify.certificate_id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Target Model:</span>
                                    <span className="font-semibold capitalize">{selectedCertToVerify.model_id.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Probes Matched:</span>
                                    <span>{selectedCertToVerify.match_count_k} / {selectedCertToVerify.trigger_count_n}</span>
                                </div>
                                <div className="flex flex-col pt-1 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-400">Embedded Digest:</span>
                                    <span className="text-[10px] break-all text-gray-600 dark:text-gray-300">
                                        {selectedCertToVerify.cryptographic_signature}
                                    </span>
                                </div>
                            </div>

                            {/* Verification Status */}
                            {isVerifyingSignature ? (
                                <div className="flex items-center justify-center gap-2 py-4 text-gray-400">
                                    <Spinner size={18} />
                                    <span>Calculating HMAC-SHA256 over canonical JSON...</span>
                                </div>
                            ) : verifyResult ? (
                                <div className={`p-3 rounded-lg border text-xs ${
                                    verifyResult.is_valid
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                }`}>
                                    <div className="font-bold mb-1">
                                        {verifyResult.is_valid
                                            ? 'VALID HMAC-SHA256 SIGNATURE · UNTAMPERED'
                                            : 'SIGNATURE TAMPER DETECTED · INVALID RECORD'}
                                    </div>
                                    <div>{verifyResult.message}</div>
                                </div>
                            ) : null}

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                                <Button
                                    variant="plain"
                                    size="xs"
                                    onClick={handleTamperTest}
                                    disabled={isVerifyingSignature}
                                    className="text-rose-600"
                                >
                                    Simulate Tampering
                                </Button>

                                <div className="flex gap-2">
                                    <Button
                                        variant="default"
                                        size="xs"
                                        onClick={() => handleVerifySignature(selectedCertToVerify)}
                                        disabled={isVerifyingSignature}
                                    >
                                        Re-verify
                                    </Button>
                                    <Button
                                        variant="solid"
                                        size="xs"
                                        onClick={() => setIsVerifyModalOpen(false)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Dialog>
        </div>
    )
}
