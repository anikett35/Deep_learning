import { FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProbeMatrixGridProps {
  matchesMask?: boolean[];
  onViewCertificate: () => void;
}

export function ProbeMatrixGrid({ matchesMask, onViewCertificate }: ProbeMatrixGridProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Trigger Probe Response Map (80 Probes)</CardTitle>
            <CardDescription className="text-xs">
              Visual inspection of model behavior on each secret probe. Crimson indicates replicated watermark response.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-rose-600 rounded-[3px]"></span>
              Planted Match
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-muted border border-border rounded-[3px]"></span>
              Independent
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Probe Matrix Grid */}
        <div className="grid grid-cols-10 sm:grid-cols-20 gap-1.5">
          {matchesMask?.map((isMatch: boolean, idx: number) => (
            <div
              key={idx}
              title={`Probe #${idx + 1}: ${isMatch ? "Matched planted class 'airplane'" : "Independent output"}`}
              className={`aspect-square rounded-[4px] border transition-transform hover:scale-125 ${
                isMatch ? "bg-rose-600 border-rose-700 shadow-xs" : "bg-muted border-border"
              }`}
            />
          ))}
        </div>

        {/* View Certificate Button */}
        <div className="mt-6 pt-4 border-t border-border flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onViewCertificate}
            className="rounded-full"
          >
            <FileText className="w-3.5 h-3.5" />
            View Official Ownership Certificate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
