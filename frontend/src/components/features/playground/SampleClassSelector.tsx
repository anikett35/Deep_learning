import { CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface SampleClassSelectorProps {
  classes: readonly string[];
  selectedClass: number;
  onSelectClass: (idx: number) => void;
  isLoading: boolean;
}

export function SampleClassSelector({
  classes,
  selectedClass,
  onSelectClass,
  isLoading,
}: SampleClassSelectorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Select Benchmark Input Sample</CardTitle>
        <CardDescription className="text-xs">
          Click a category sample to trigger live inference on the victim model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {classes.map((clsName, idx) => (
            <button
              key={clsName}
              type="button"
              onClick={() => onSelectClass(idx)}
              disabled={isLoading}
              className={`p-2.5 rounded-lg border text-left text-xs font-semibold capitalize transition flex items-center justify-between cursor-pointer ${
                selectedClass === idx
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              <span>
                {idx}: {clsName}
              </span>
              {selectedClass === idx && (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
