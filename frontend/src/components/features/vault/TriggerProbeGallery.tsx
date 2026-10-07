import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TriggerProbe {
  id: number;
  targetClass: string;
  naturalClass: string;
}

interface TriggerProbeGalleryProps {
  triggers: TriggerProbe[];
}

export function TriggerProbeGallery({ triggers }: TriggerProbeGalleryProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Sample Trigger Probes (Visual Micro-Stamp Inspection)
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Each probe carries a high-frequency localized 4x4 alternating stamp in the bottom-right
          corner. Normal models see a natural object (cat, truck, dog), but a model extracted from
          the victim classifies them with high confidence as <strong>airplane</strong>.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {triggers.map((t) => (
            <div
              key={t.id}
              className="bg-muted/40 border border-border rounded-xl p-3 text-center space-y-2 hover:bg-muted/70 transition"
            >
              <div className="w-full aspect-square bg-card border border-border rounded-lg relative overflow-hidden flex items-center justify-center">
                {/* Simulated visual image pattern */}
                <div className="w-full h-full opacity-60 bg-gradient-to-br from-muted via-background to-muted"></div>
                {/* 4x4 Corner Stamp */}
                <div className="absolute bottom-1.5 right-1.5 w-4 h-4 grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5 bg-foreground/90 rounded-[2px] shadow-xs">
                  <div className="bg-cyan-400"></div>
                  <div className="bg-pink-500"></div>
                  <div className="bg-pink-500"></div>
                  <div className="bg-cyan-400"></div>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-foreground font-mono">Probe #{t.id}</div>
                <div className="text-[10px] text-muted-foreground font-medium capitalize">
                  Object: {t.naturalClass}
                </div>
                <div className="mt-1">
                  <Badge variant="info" className="text-[9px] px-1.5 py-0 font-mono">
                    airplane
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
