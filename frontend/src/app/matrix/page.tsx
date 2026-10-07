import { Scale } from "lucide-react";
import { DEFENSE_STRATEGIES } from "@/constants/defenses";
import { DefenseMatrixTable } from "@/components/features/matrix/DefenseMatrixTable";

export default function DefenseMatrixPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Scale className="w-6 h-6 text-foreground" />
          Comparative Defense Matrix & Threat Model
        </h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Why conventional defenses fail against black-box extraction attacks, and how ModelGuard establishes defensible ownership proof.
        </p>
      </div>

      {/* Comparison Table Feature Component */}
      <DefenseMatrixTable defenses={DEFENSE_STRATEGIES} />
    </div>
  );
}
