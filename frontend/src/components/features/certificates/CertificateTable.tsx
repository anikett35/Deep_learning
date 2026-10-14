'use client'

import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { AuditDbRecord } from '@/types/audit'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Table from '@/components/ui/Table'
import Spinner from '@/components/ui/Spinner'

const { THead, TBody, Tr, Th, Td } = Table

interface CertificateTableProps {
    certificates: AuditDbRecord[]
    isLoading: boolean
}

export function CertificateTable({
    certificates,
    isLoading,
}: CertificateTableProps) {
    return (
        <Card className="p-0 overflow-hidden">
            <Table hoverable>
                <THead>
                    <Tr>
                        <Th>Certificate ID</Th>
                        <Th>Target Model</Th>
                        <Th>Probes Matched</Th>
                        <Th>Binomial P-Value</Th>
                        <Th>Confidence</Th>
                        <Th>Forensic Verdict</Th>
                        <Th>Timestamp</Th>
                    </Tr>
                </THead>
                <TBody>
                    {isLoading ? (
                        <Tr>
                            <Td colSpan={7} className="py-12 text-center text-gray-400 font-mono">
                                <div className="flex items-center justify-center gap-2">
                                    <Spinner size={20} />
                                    <span>Querying PostgreSQL database records...</span>
                                </div>
                            </Td>
                        </Tr>
                    ) : certificates.length === 0 ? (
                        <Tr>
                            <Td colSpan={7} className="py-12 text-center text-gray-500">
                                No audit records found in database. Run an audit on the Ownership Audit page to generate a certificate!
                            </Td>
                        </Tr>
                    ) : (
                        certificates.map((cert) => {
                            const isTheft =
                                cert.riskLevel === 'CRITICAL' || cert.riskLevel === 'HIGH'
                            return (
                                <Tr key={cert.id}>
                                    <Td className="font-mono font-semibold heading-text">
                                        {cert.certificateId}
                                    </Td>
                                    <Td className="font-medium text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                                        {cert.targetModel}
                                    </Td>
                                    <Td className="font-mono font-bold heading-text">
                                        {cert.matches} / {cert.totalTriggers}
                                    </Td>
                                    <Td className="font-mono text-gray-500 dark:text-gray-400">
                                        {cert.pValue < 0.001
                                            ? cert.pValue.toExponential(2)
                                            : cert.pValue.toFixed(4)}
                                    </Td>
                                    <Td className="font-mono font-semibold text-success">
                                        {cert.confidence.toFixed(2)}%
                                    </Td>
                                    <Td>
                                        <Tag
                                            className={`font-mono text-[10px] font-bold ${
                                                isTheft
                                                    ? 'bg-error-subtle text-error border-error/30'
                                                    : 'bg-success-subtle text-success border-success/30'
                                            }`}
                                        >
                                            {isTheft ? (
                                                <ShieldAlert className="w-3 h-3 mr-1 inline" />
                                            ) : (
                                                <ShieldCheck className="w-3 h-3 mr-1 inline" />
                                            )}
                                            {cert.verdict}
                                        </Tag>
                                    </Td>
                                    <Td className="font-mono text-gray-400 text-[11px]">
                                        {new Date(cert.timestamp)
                                            .toISOString()
                                            .replace('T', ' ')
                                            .substring(0, 19)}
                                    </Td>
                                </Tr>
                            )
                        })
                    )}
                </TBody>
            </Table>
        </Card>
    )
}
