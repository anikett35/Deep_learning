"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, Clock } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function ResearchCharts() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    extraction: Record<string, any>;
    adaptive: any;
    status: Record<string, string>;
  }>({
    extraction: {},
    adaptive: null,
    status: {},
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics-data");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error("Failed to load analytics data", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const allBudgets = [1000, 5000, 10000, 20000];
  const executedBudgets = Object.keys(data.extraction)
    .map(Number)
    .sort((a, b) => a - b);

  const labels = allBudgets.map((b) => `${b.toLocaleString()} queries`);
  
  // Real measured points; null for unrun budgets to avoid fabricating lines
  const agreementPoints = allBudgets.map((b) => {
    const item = data.extraction[String(b)];
    return item ? Number((item.victim_thief_agreement * 100).toFixed(1)) : null;
  });

  const accuracyPoints = allBudgets.map((b) => {
    const item = data.extraction[String(b)];
    return item ? Number((item.thief_clean_test_accuracy * 100).toFixed(1)) : null;
  });

  const wmPoints = allBudgets.map((b) => {
    const item = data.extraction[String(b)];
    return item ? Number((item.thief_watermark_match_rate * 100).toFixed(1)) : null;
  });

  const chart1Data = {
    labels,
    datasets: [
      {
        label: "Victim Agreement Rate (%)",
        data: agreementPoints,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.08)",
        fill: true,
        tension: 0.2,
        pointRadius: 6,
        spanGaps: false,
      },
      {
        label: "Thief Test Accuracy (%)",
        data: accuracyPoints,
        borderColor: "#7c3aed",
        borderDash: [4, 4],
        tension: 0.2,
        pointRadius: 6,
        spanGaps: false,
      },
    ],
  };

  const chart2Data = {
    labels,
    datasets: [
      {
        label: "Watermark Match Rate (%)",
        data: wmPoints,
        borderColor: "#dc2626",
        backgroundColor: "rgba(220, 38, 38, 0.06)",
        fill: true,
        tension: 0.2,
        pointRadius: 6,
        spanGaps: false,
      },
    ],
  };

  // Adaptive attack comparison
  const adaptiveBeforeAcc = data.adaptive?.before?.clean_accuracy
    ? (data.adaptive.before.clean_accuracy * 100).toFixed(1)
    : null;
  const adaptiveAfterAcc = data.adaptive?.after?.clean_accuracy
    ? (data.adaptive.after.clean_accuracy * 100).toFixed(1)
    : null;
  const adaptiveBeforeWm = data.adaptive?.before?.watermark_match_rate
    ? (data.adaptive.before.watermark_match_rate * 100).toFixed(1)
    : null;
  const adaptiveAfterWm = data.adaptive?.after?.watermark_match_rate
    ? (data.adaptive.after.watermark_match_rate * 100).toFixed(1)
    : null;

  const chart3Data = {
    labels: ["Clean Test Accuracy", "Watermark Match Rate"],
    datasets: [
      {
        label: "Before Fine-Tuning (Thief)",
        data: [
          adaptiveBeforeAcc ? Number(adaptiveBeforeAcc) : 0,
          adaptiveBeforeWm ? Number(adaptiveBeforeWm) : 0,
        ],
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderRadius: 4,
      },
      {
        label: "After Clean Fine-Tuning",
        data: [
          adaptiveAfterAcc ? Number(adaptiveAfterAcc) : 0,
          adaptiveAfterWm ? Number(adaptiveAfterWm) : 0,
        ],
        backgroundColor: "rgba(249, 115, 22, 0.8)",
        borderRadius: 4,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading real experimental analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Experiment Execution Status Banner */}
      <div className="flex flex-wrap gap-2 items-center p-3 bg-card border border-border rounded-lg text-xs">
        <span className="font-semibold text-foreground uppercase tracking-wider">Experiment State:</span>
        {allBudgets.map((b) => {
          const isDone = data.extraction[String(b)];
          return (
            <Badge
              key={b}
              variant={isDone ? "default" : "outline"}
              className={isDone ? "bg-emerald-600 text-white" : "text-muted-foreground border-dashed"}
            >
              {isDone ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
              {b.toLocaleString()} Q: {isDone ? "COMPLETED" : "PENDING EXPERIMENT"}
            </Badge>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">1. Extraction Fidelity Scaling</CardTitle>
              <Badge variant="outline" className="text-xs">
                Real PyTorch Measurements
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Victim-thief agreement (fidelity) and thief accuracy scaling across black-box budgets.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <Line
              data={chart1Data}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { min: 0, max: 100, title: { display: true, text: "Percentage (%)" } },
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Chart 2 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">2. Watermark Transfer Curve</CardTitle>
              <Badge variant="outline" className="text-xs">
                Null Baseline p0 = 10%
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Empirical match rate of 80 secret trigger probes transferred to the substitute thief model.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <Line
              data={chart2Data}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { min: 0, max: 100, title: { display: true, text: "Match Rate (%)" } },
                },
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Adaptive Attack Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">3. Adaptive Attack Impact: Clean Fine-Tuning Evasion</CardTitle>
            <Badge variant="outline" className="text-xs">
              {data.adaptive ? "REAL EXPERIMENTAL MEASUREMENT" : "PENDING EXPERIMENT"}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Evaluates whether fine-tuning the stolen model exclusively on clean domain samples weakens the embedded watermark.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.adaptive ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2 h-64">
                <Bar
                  data={chart3Data}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: { min: 0, max: 100, title: { display: true, text: "Percentage (%)" } },
                    },
                  }}
                />
              </div>
              <div className="space-y-3 bg-muted/40 p-4 rounded-lg text-xs">
                <div className="font-semibold text-foreground uppercase tracking-wider">Empirical Findings:</div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Clean Accuracy Delta:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {data.adaptive.deltas?.clean_accuracy_delta > 0 ? "+" : ""}
                    {(data.adaptive.deltas?.clean_accuracy_delta * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Watermark Retention Delta:</span>
                  <span className="font-mono font-bold text-amber-600">
                    {(data.adaptive.deltas?.watermark_match_rate_delta * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Watermark State:</span>
                  <span className="font-mono font-bold">
                    {data.adaptive.watermark_survived ? "SURVIVED" : "WEAKENED/REMOVED"}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Clean Tuning Duration:</span>
                  <span className="font-mono">{data.adaptive.duration_seconds}s</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              PENDING EXPERIMENT: Run `python ml/attacks/adaptive_finetune.py` to observe fine-tuning evasion trade-offs.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real Experiment Inspection Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Extraction Experiments Log</CardTitle>
          <CardDescription className="text-xs">
            Summary of all executed black-box extraction runs and substitute model topologies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold">
                <tr>
                  <th className="p-2.5">Budget</th>
                  <th className="p-2.5">Architecture</th>
                  <th className="p-2.5">Agreement (Fidelity)</th>
                  <th className="p-2.5">Thief Accuracy</th>
                  <th className="p-2.5">Watermark Match</th>
                  <th className="p-2.5">Training Time</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allBudgets.map((b) => {
                  const item = data.extraction[String(b)];
                  if (item) {
                    return (
                      <tr key={b} className="hover:bg-muted/30">
                        <td className="p-2.5 font-mono font-bold">{b.toLocaleString()}</td>
                        <td className="p-2.5 font-mono">{item.thief_architecture || "ThiefCNN"}</td>
                        <td className="p-2.5 font-mono text-blue-600 font-bold">
                          {(item.victim_thief_agreement * 100).toFixed(1)}%
                        </td>
                        <td className="p-2.5 font-mono">{(item.thief_clean_test_accuracy * 100).toFixed(1)}%</td>
                        <td className="p-2.5 font-mono font-bold text-red-600">
                          {(item.thief_watermark_match_rate * 100).toFixed(1)}% ({item.thief_watermark_matches}/80)
                        </td>
                        <td className="p-2.5 font-mono">{item.training_time_seconds?.toFixed(1)}s</td>
                        <td className="p-2.5">
                          <span className="text-emerald-600 font-semibold">COMPLETED</span>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={b} className="text-muted-foreground/60 italic">
                      <td className="p-2.5 font-mono">{b.toLocaleString()}</td>
                      <td className="p-2.5 font-mono">ThiefCNN</td>
                      <td className="p-2.5">—</td>
                      <td className="p-2.5">—</td>
                      <td className="p-2.5">—</td>
                      <td className="p-2.5">—</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                          PENDING EXPERIMENT
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
