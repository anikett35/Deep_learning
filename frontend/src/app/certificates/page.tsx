"use client";

import { useEffect, useState } from "react";
import { Database, Search, RefreshCw } from "lucide-react";
import { AuditDbRecord } from "@/types/audit";
import { fetchCertificates } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CertificateTable } from "@/components/features/certificates/CertificateTable";

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<AuditDbRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  async function loadCertificates() {
    setIsLoading(true);
    try {
      const data = await fetchCertificates();
      setCertificates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCertificates();
  }, []);

  const filtered = certificates.filter(
    (c) =>
      c.certificateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.targetModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.verdict.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Database className="w-6 h-6 text-foreground" />
            PostgreSQL Ownership Audit Archive
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Permanent forensic certificates and model extraction audit records stored in PostgreSQL.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadCertificates}
          className="rounded-full self-start sm:self-auto gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Database
        </Button>
      </div>

      {/* Search Input */}
      <div className="max-w-md relative flex items-center">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
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
  );
}
