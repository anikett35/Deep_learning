import { Card, CardContent } from "@/components/ui/card";

export function TriggerStatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="py-4">
        <CardContent className="p-0 text-center">
          <div className="text-lg font-bold font-mono text-blue-600">airplane (Class #0)</div>
          <div className="text-[11px] uppercase font-semibold text-muted-foreground mt-0.5">
            Planted Target Label
          </div>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardContent className="p-0 text-center">
          <div className="text-lg font-bold font-mono text-foreground">4x4 bottom_right</div>
          <div className="text-[11px] uppercase font-semibold text-muted-foreground mt-0.5">
            Watermark Stamp Geometry
          </div>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardContent className="p-0 text-center">
          <div className="text-xs font-mono font-bold text-emerald-600 break-all px-2">
            5743818e49d74992b7b35efb...
          </div>
          <div className="text-[11px] uppercase font-semibold text-muted-foreground mt-0.5">
            SHA-256 Digital Fingerprint
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
