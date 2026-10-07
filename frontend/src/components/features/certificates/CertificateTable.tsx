import { ShieldAlert, ShieldCheck } from "lucide-react";
import { AuditDbRecord } from "@/types/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CertificateTableProps {
  certificates: AuditDbRecord[];
  isLoading: boolean;
}

export function CertificateTable({ certificates, isLoading }: CertificateTableProps) {
  return (
    <Card className="py-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Certificate ID</th>
                <th className="py-3 px-4">Target Model</th>
                <th className="py-3 px-4">Probes Matched</th>
                <th className="py-3 px-4">Binomial P-Value</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Forensic Verdict</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground font-mono">
                    Querying PostgreSQL database records...
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No audit records found in database. Run an audit on the Ownership Audit page to
                    generate a certificate!
                  </td>
                </tr>
              ) : (
                certificates.map((cert) => {
                  const isTheft = cert.riskLevel === "CRITICAL" || cert.riskLevel === "HIGH";
                  return (
                    <tr key={cert.id} className="hover:bg-muted/30 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                        {cert.certificateId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground/80 max-w-[200px] truncate">
                        {cert.targetModel}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {cert.matches} / {cert.totalTriggers}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {cert.pValue < 0.001 ? cert.pValue.toExponential(2) : cert.pValue.toFixed(4)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-700">
                        {cert.confidence.toFixed(2)}%
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={isTheft ? "danger" : "success"}
                          className="font-mono text-[10px] gap-1.5"
                        >
                          {isTheft ? (
                            <ShieldAlert className="w-3 h-3" />
                          ) : (
                            <ShieldCheck className="w-3 h-3" />
                          )}
                          {cert.verdict}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground text-[11px]">
                        {new Date(cert.timestamp).toISOString().replace("T", " ").substring(0, 19)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
