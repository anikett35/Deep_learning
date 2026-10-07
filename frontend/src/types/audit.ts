export interface TargetPreset {
  id: string;
  name: string;
  badge: string;
  badgeVariant: "info" | "danger" | "warning" | "success" | "secondary" | "default" | "outline";
  description: string;
}

export interface AuditStats {
  risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "CLEAN" | string;
  verdict: string;
  match_rate_pct: string;
  p_value_formatted: string;
  confidence_percent: number;
  detailed_summary: string;
}

export interface AuditResult {
  matches: number;
  total_triggers: number;
  all_matches_mask?: boolean[];
  stats: AuditStats;
}

export interface VerificationCertificate {
  certificate_id: string;
  timestamp: string;
  target_model: string;
  sha256_hash: string;
  matches: number;
  total_triggers: number;
  confidence_percent: number;
  verdict: string;
  summary: string;
}

export interface AuditDbRecord {
  id: string;
  certificateId: string;
  targetModel: string;
  auditType: string;
  matches: number;
  totalTriggers: number;
  matchRatio: number;
  pValue: number;
  confidence: number;
  riskLevel: string;
  verdict: string;
  timestamp: string;
}
