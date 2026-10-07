import { Printer } from "lucide-react";
import { VerificationCertificate } from "@/types/audit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: VerificationCertificate | null;
}

export function CertificateModal({ open, onOpenChange, certificate }: CertificateModalProps) {
  if (!certificate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-center pb-4 border-b border-border">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Official Forensic Document
          </div>
          <DialogTitle className="text-xl font-bold mt-1">
            CERTIFICATE OF OWNERSHIP AUDIT
          </DialogTitle>
          <DialogDescription className="text-xs">
            ModelGuard Behavioral Cryptographic Verification Framework (PostgreSQL Archive)
          </DialogDescription>
        </DialogHeader>

        {/* Document Stamp Box */}
        <div className="my-4 p-4 rounded-xl border border-dashed border-border bg-muted/50 text-xs font-mono space-y-1.5 text-foreground">
          <div>
            <strong>Certificate ID:</strong> {certificate.certificate_id}
          </div>
          <div>
            <strong>Timestamp:</strong> {certificate.timestamp}
          </div>
          <div>
            <strong>Subject Model:</strong> {certificate.target_model}
          </div>
          <div className="break-all">
            <strong>SHA-256 Signature:</strong> {certificate.sha256_hash}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3 bg-muted/40 border border-border rounded-xl text-center">
            <div className="text-base font-bold font-mono text-foreground">
              {certificate.matches} / {certificate.total_triggers}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground font-semibold mt-0.5">
              Probes Matched
            </div>
          </div>

          <div className="p-3 bg-muted/40 border border-border rounded-xl text-center">
            <div className="text-base font-bold font-mono text-emerald-700">
              {certificate.confidence_percent.toFixed(2)}%
            </div>
            <div className="text-[10px] uppercase text-muted-foreground font-semibold mt-0.5">
              Confidence
            </div>
          </div>

          <div className="p-3 bg-muted/40 border border-border rounded-xl text-center">
            <div className="text-xs font-bold font-mono text-rose-700 leading-tight">
              {certificate.verdict}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground font-semibold mt-0.5">
              Verdict
            </div>
          </div>
        </div>

        {/* Forensic Finding */}
        <div className="my-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Forensic Attestation
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed mt-1.5">
            {certificate.summary}
          </p>
        </div>

        {/* Dialog Footer Actions */}
        <DialogFooter className="mt-4 pt-4 border-t border-border sm:justify-end">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => window.print()}
            className="rounded-full gap-2"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Export Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
