'use client'

import { Printer } from 'lucide-react'
import { VerificationCertificate } from '@/types/audit'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'

interface CertificateModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    certificate: VerificationCertificate | null
}

export function CertificateModal({
    open,
    onOpenChange,
    certificate,
}: CertificateModalProps) {
    if (!certificate) return null

    return (
        <Dialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            width={680}
        >
            <div className="space-y-4">
                <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
                    <Tag className="font-mono text-[10px] uppercase font-bold tracking-wider mb-2">
                        Official Forensic Document
                    </Tag>
                    <h4 className="text-xl font-bold heading-text">
                        CERTIFICATE OF OWNERSHIP AUDIT
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ModelGuard Behavioral Cryptographic Verification Framework (PostgreSQL Archive)
                    </p>
                </div>

                {/* Document Stamp Box */}
                <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-xs font-mono space-y-1.5 text-gray-800 dark:text-gray-200">
                    <div>
                        <strong className="text-gray-500 dark:text-gray-400">Certificate ID:</strong> {certificate.certificate_id}
                    </div>
                    <div>
                        <strong className="text-gray-500 dark:text-gray-400">Timestamp:</strong> {certificate.timestamp}
                    </div>
                    <div>
                        <strong className="text-gray-500 dark:text-gray-400">Subject Model:</strong> {certificate.target_model}
                    </div>
                    <div className="break-all">
                        <strong className="text-gray-500 dark:text-gray-400">SHA-256 Signature:</strong> {certificate.sha256_hash}
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-3 my-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-center">
                        <div className="text-base font-bold font-mono heading-text">
                            {certificate.matches} / {certificate.total_triggers}
                        </div>
                        <div className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                            Probes Matched
                        </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-center">
                        <div className="text-base font-bold font-mono text-success">
                            {certificate.confidence_percent.toFixed(2)}%
                        </div>
                        <div className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                            Confidence
                        </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-center">
                        <div className="text-xs font-bold font-mono text-error leading-tight">
                            {certificate.verdict}
                        </div>
                        <div className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                            Verdict
                        </div>
                    </div>
                </div>

                {/* Forensic Finding */}
                <div className="my-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Forensic Attestation
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-1.5">
                        {certificate.summary}
                    </p>
                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <Button
                        type="button"
                        variant="solid"
                        size="sm"
                        onClick={() => window.print()}
                        icon={<Printer className="w-3.5 h-3.5 mr-1" />}
                    >
                        Print / Export Document
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}
