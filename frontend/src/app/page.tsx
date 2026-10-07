"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  Play,
  RefreshCw,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Database,
  ExternalLink,
} from "lucide-react";
import { AUDIT_PRESETS } from "@/constants/presets";
import { AuditResult, VerificationCertificate } from "@/types/audit";
import { executeAudit } from "@/services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TargetPresetSelector } from "@/components/features/audit/TargetPresetSelector";
import { AuditFindingsBanner } from "@/components/features/audit/AuditFindingsBanner";
import { AuditMetricCards } from "@/components/features/audit/AuditMetricCards";
import { ProbeMatrixGrid } from "@/components/features/audit/ProbeMatrixGrid";
import { CertificateModal } from "@/components/features/audit/CertificateModal";

export default function OverviewPage() {
  const [selectedTarget, setSelectedTarget] = useState<string>("victim");
  const [customUrl, setCustomUrl] = useState<string>("http://localhost:8000/predict");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [certificate, setCertificate] = useState<VerificationCertificate | null>(null);
  const [showCertModal, setShowCertModal] = useState<boolean>(false);

  // Overview real metrics state
  const [overview, setOverview] = useState<any>({
    hardware: { device: "CPU (AMD64)" },
    metrics: {
      baseline_accuracy: null,
      victim_clean_accuracy: null,
      victim_trigger_accuracy: null,
      victim_trigger_matches: null,
      best_thief_agreement: null,
      best_thief_budget: null,
      latest_verification: null,
    },
    status: {},
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/overview-stats");
        if (res.ok) {
          const data = await res.json();
          setOverview(data);
        }
      } catch (e) {
        console.error("Failed to load overview stats:", e);
      }
    }
    loadStats();
  }, []);

  async function handleRunAudit() {
    setIsLoading(true);
    setProgress(15);
    setStatusMessage("Transmitting 80 cryptographic watermark probes to target...");
    setAuditResult(null);
    setCertificate(null);

    const progressTimer = setInterval(() => {
      setProgress((prev) => (prev < 85 ? prev + 25 : prev));
    }, 150);

    const targetVal = selectedTarget === "custom" ? customUrl : selectedTarget;
    const auditTypeVal = selectedTarget === "custom" ? "remote_http_api" : "preset";

    try {
      const data = await executeAudit(targetVal, auditTypeVal);
      clearInterval(progressTimer);
      setProgress(100);
      setStatusMessage("Exact binomial test complete! Record saved to PostgreSQL.");

      setTimeout(() => {
        setAuditResult(data.audit);
        setCertificate(data.certificate);
        setIsLoading(false);
      }, 350);
    } catch (err: any) {
      clearInterval(progressTimer);
      setIsLoading(false);
      alert(`Audit failed: ${err.message}`);
    }
  }

  const pipelineStages = [
    { name: "TRAIN", label: "Baseline Control", status: overview?.status?.baseline || "PENDING" },
    { name: "WATERMARK", label: "80-Probe Victim", status: overview?.status?.watermark || "PENDING" },
    { name: "SERVE", label: "FastAPI Black-Box", status: "PASS" },
    { name: "EXTRACT", label: "1k-5k Substitute", status: overview?.status?.extraction_1000 || "PENDING" },
    { name: "VERIFY", label: "SciPy Binomial Test", status: overview?.status?.verification || "PENDING" },
    { name: "ADAPTIVE ATTACK", label: "Clean Evasion", status: overview?.status?.adaptive_attack || "PENDING" },
    { name: "REPORT", label: "Scientific Audit", status: overview?.status?.report || "PENDING" },
  ];

  return (
    <div className="space-y-8">
      {/* Brand Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Spedrix &bull; PeoKit Deep Learning
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-primary" />
            MODELGuard Security Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Active Intellectual Property Watermarking & Black-Box Model Extraction Verification System
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            {overview?.hardware?.device || "CPU (AMD64)"}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs text-emerald-600 border-emerald-500/30 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            PostgreSQL 18.4
          </Badge>
        </div>
      </div>

      {/* Visual ML Pipeline */}
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              End-to-End Experimental Research Pipeline
            </CardTitle>
            <span className="text-xs font-mono text-muted-foreground">Status: Active Loop</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {pipelineStages.map((stage, idx) => {
              const isPass = stage.status === "PASS";
              return (
                <div key={stage.name} className="flex items-center gap-2">
                  <div
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      isPass
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isPass ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                      )}
                      <span className="font-bold">{stage.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{stage.label}</div>
                  </div>
                  {idx < pipelineStages.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 hidden lg:block" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Real Experimental Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Control Baseline Acc
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-1.5">
              {overview?.metrics?.baseline_accuracy
                ? `${(overview.metrics.baseline_accuracy * 100).toFixed(1)}%`
                : "PENDING"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Unwatermarked reference model</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Victim Clean Test Acc
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-1.5">
              {overview?.metrics?.victim_clean_accuracy
                ? `${(overview.metrics.victim_clean_accuracy * 100).toFixed(1)}%`
                : "PENDING"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">CIFAR-10 test set accuracy</p>
          </CardContent>
        </Card>

        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-5">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider">
              Trigger Probe Memorization
            </div>
            <div className="text-2xl font-bold font-mono text-primary mt-1.5">
              {overview?.metrics?.victim_trigger_accuracy != null
                ? `${(overview.metrics.victim_trigger_accuracy * 100).toFixed(1)}%`
                : "PENDING"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {overview?.metrics?.victim_trigger_matches != null ? `${overview.metrics.victim_trigger_matches}/80` : "80"} probes verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Best Thief Agreement
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-1.5">
              {overview?.metrics?.best_thief_agreement
                ? `${(overview.metrics.best_thief_agreement * 100).toFixed(1)}%`
                : "PENDING"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Fidelity at {overview?.metrics?.best_thief_budget || "5,000"} queries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Target Selector Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Interactive Ownership Verification Studio</CardTitle>
          <CardDescription className="text-xs">
            Interrogate any trained checkpoint preset or external API endpoint with the secret 80 watermark probes. Exact binomial hypothesis testing runs in real time via SciPy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TargetPresetSelector
            presets={AUDIT_PRESETS}
            selectedTarget={selectedTarget}
            onSelectTarget={setSelectedTarget}
            customUrl={customUrl}
            onChangeCustomUrl={setCustomUrl}
          />

          {/* Action Trigger */}
          <div className="pt-5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Button
              type="button"
              onClick={handleRunAudit}
              disabled={isLoading}
              variant="pill"
              className="text-sm font-medium"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Interrogating Probes...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Execute Exact Binomial Verification Audit
                </>
              )}
            </Button>
            <div className="text-xs font-mono text-muted-foreground">
              80 Secret Probes &bull; Null Rate p0 = 10.0% &bull; Significance &alpha; = 0.01
            </div>
          </div>

          {/* Progress Bar */}
          {isLoading && (
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5 font-mono">
                <span>{statusMessage}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Findings Result */}
      {auditResult && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <AuditFindingsBanner stats={auditResult.stats} />
          <AuditMetricCards auditResult={auditResult} />
          <ProbeMatrixGrid
            matchesMask={auditResult.all_matches_mask}
            onViewCertificate={() => setShowCertModal(true)}
          />
        </div>
      )}

      {/* Official Certificate Dialog */}
      <CertificateModal
        open={showCertModal}
        onOpenChange={setShowCertModal}
        certificate={certificate}
      />
    </div>
  );
}
