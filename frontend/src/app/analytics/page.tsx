import { BarChart3 } from "lucide-react";
import { ResearchCharts } from "@/components/features/analytics/ResearchCharts";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-foreground" />
          Empirical Research Analytics & Key Findings
        </h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Comprehensive benchmark curves documenting model extraction fidelity, watermark inheritance dynamics, and defense evasion survival.
        </p>
      </div>

      {/* Feature Charts */}
      <ResearchCharts />
    </div>
  );
}
