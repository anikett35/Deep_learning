'use client'

import { useEffect, useState } from 'react'
import { Database, Search, RefreshCw } from 'lucide-react'
import { AuditDbRecord } from '@/types/audit'
import { fetchCertificates } from '@/services/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Tag from '@/components/ui/Tag'
import { CertificateTable } from '@/components/features/certificates/CertificateTable'

export default function CertificatesPage() {
    const [certificates, setCertificates] = useState<AuditDbRecord[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [searchTerm, setSearchTerm] = useState<string>('')

    async function loadCertificates() {
        setIsLoading(true)
        try {
            const data = await fetchCertificates()
            setCertificates(data)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadCertificates()
    }, [])

    const filtered = certificates.filter(
        (c) =>
            c.certificateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.targetModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.verdict.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Tag className="text-[10px] font-bold uppercase tracking-wider bg-primary-subtle text-primary border-primary/20">
                            PostgreSQL Archive
                        </Tag>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight heading-text flex items-center gap-2.5">
                        <Database className="w-7 h-7 text-primary" />
                        Forensic Ownership Certificates Archive
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Permanent forensic certificates and model extraction audit records stored in PostgreSQL.
                    </p>
                </div>

                <Button
                    variant="default"
                    size="sm"
                    onClick={loadCertificates}
                    icon={
                        <RefreshCw
                            className={`w-3.5 h-3.5 mr-1 ${
                                isLoading ? 'animate-spin' : ''
                            }`}
                        />
                    }
                >
                    Refresh Database
                </Button>
            </div>

            {/* Search Input */}
            <div className="max-w-md relative flex items-center">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                <Input
                    type="text"
                    placeholder="Search by Certificate ID, Model, or Verdict..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 font-mono text-xs"
                />
            </div>

            {/* Table Feature Component */}
            <CertificateTable certificates={filtered} isLoading={isLoading} />
        </div>
    )
}
