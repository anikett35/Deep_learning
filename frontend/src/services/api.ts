import { AuditDbRecord, AuditResult, VerificationCertificate } from "@/types/audit";
import { PredictionResponse, SystemStatusResponse } from "@/types/prediction";

export async function executeAudit(
  target: string,
  auditType: "preset" | "remote_http_api"
): Promise<{ audit: AuditResult; certificate: VerificationCertificate }> {
  const res = await fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, auditType }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Audit request failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchCertificates(): Promise<AuditDbRecord[]> {
  const res = await fetch("/api/certificates");
  if (!res.ok) {
    throw new Error(`Failed to load certificates (status ${res.status})`);
  }
  const data = await res.json();
  return data.audits || [];
}

export async function predictSample(classIdx: number): Promise<PredictionResponse> {
  const res = await fetch(`/api/predict?sampleClass=${classIdx}`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Inference request failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchSystemStatus(): Promise<SystemStatusResponse> {
  const res = await fetch("/api/system-status");
  if (!res.ok) {
    throw new Error(`System status check failed with status ${res.status}`);
  }
  return res.json();
}
