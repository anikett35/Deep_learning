"use client";

import { Lock, ShieldAlert, KeyRound, Fingerprint, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TriggerItem {
  trigger_id: string;
  source_index: number;
  source_class_name: string;
  target_class_name: string;
  thumbnail_base64: string | null;
}

interface VaultData {
  trigger_count: number;
  target_class_name: string;
  target_class_idx: number;
  patch_size: string;
  corner: string;
  pattern: string;
  intensity: number;
  sha256_fingerprint: string;
  hash_algorithm: string;
  triggers: TriggerItem[];
}

export default function VaultPage() {
  const [data, setData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/triggers")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load triggers:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Prominent Secret Research Artifact Alert Banner */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">
                SECRET RESEARCH ARTIFACT
              </span>
              <span className="text-xs font-semibold">Strict Access Control</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-1 leading-relaxed">
              These visual probe triggers constitute the proprietary ground truth for black-box statistical verification. 
              Never expose this probe manifest or trigger metadata through public client-facing prediction APIs.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Lock className="w-6 h-6 text-foreground" />
          Secret Ownership Trigger Vault
        </h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Cryptographically signed 80-probe watermark trigger population. Every trigger stamps a high-frequency visual pattern forcing the victim to predict target class &apos;{data?.target_class_name || "airplane"}&apos;.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="py-4">
          <CardContent className="p-0 text-center">
            <div className="text-lg font-bold font-mono text-blue-600">
              {data?.target_class_name || "airplane"} (Class #{data?.target_class_idx ?? 0})
            </div>
            <div className="text-[11px] uppercase font-semibold text-muted-foreground mt-0.5">
              Planted Target Label
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="p-0 text-center">
            <div className="text-lg font-bold font-mono text-foreground">
              {data ? `${data.patch_size} ${data.corner}` : "4x4 bottom_right"}
            </div>
            <div className="text-[11px] uppercase font-semibold text-muted-foreground mt-0.5">
              Watermark Geometry ({data?.pattern || "checkerboard"})
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="p-0 text-center">
            <div className="text-lg font-bold font-mono text-foreground">
              {data?.trigger_count || 80} Probes
            </div>
            <div className="text-[11px] uppercase font-semibold text-muted-foreground mt-0.5">
              Probe Population Size
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="p-0 text-center">
            <div className="text-xs font-mono font-bold text-emerald-600 break-all px-2">
              {data?.sha256_fingerprint ? `${data.sha256_fingerprint.slice(0, 16)}...` : "Loading..."}
            </div>
            <div className="text-[11px] uppercase font-semibold text-muted-foreground mt-0.5">
              SHA-256 Fingerprint
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trigger Gallery */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Watermarked Probe Gallery ({data?.triggers.length || 0} Probes Displayed)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Actual synthesized CIFAR-10 images stamped with localized 4x4 high-frequency micro-patterns.
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-[11px] self-start sm:self-auto">
            SHA-256: {data?.sha256_fingerprint.slice(0, 8)}...
          </Badge>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground font-mono">
            Loading secret trigger probes from artifact vault...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {data?.triggers.map((t) => (
              <div
                key={t.trigger_id}
                className="bg-muted/40 border border-border rounded-xl p-2.5 text-center space-y-2 hover:bg-muted/70 transition"
              >
                <div className="w-full aspect-square bg-card border border-border rounded-lg relative overflow-hidden flex items-center justify-center">
                  {t.thumbnail_base64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.thumbnail_base64}
                      alt={t.trigger_id}
                      className="w-full h-full object-cover pixelated"
                    />
                  ) : (
                    <div className="w-full h-full opacity-60 bg-gradient-to-br from-muted via-background to-muted" />
                  )}
                  {/* Stamp indicator badge */}
                  <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-[1px] ring-1 ring-black" title="4x4 Stamp" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-foreground font-mono">
                    {t.trigger_id}
                  </div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {t.source_class_name} &rarr;
                  </div>
                  <div className="mt-0.5">
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono text-emerald-600 bg-emerald-500/10">
                      {t.target_class_name}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
