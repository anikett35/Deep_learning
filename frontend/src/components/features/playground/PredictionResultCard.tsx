import { PredictionResponse } from "@/types/prediction";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PredictionResultCardProps {
  prediction: PredictionResponse | null;
  classes: readonly string[];
}

export function PredictionResultCard({ prediction, classes }: PredictionResultCardProps) {
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Model Output & Softmax Probabilities</CardTitle>
        </CardHeader>
        <CardContent>
          {prediction ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                <div className="text-xs uppercase font-mono text-muted-foreground font-semibold">
                  Predicted Class
                </div>
                <div className="text-2xl font-bold font-mono text-foreground capitalize mt-0.5">
                  {prediction.predicted_class}
                </div>
                <div className="mt-1">
                  <Badge variant="success" className="font-mono text-xs">
                    {(prediction.confidence * 100).toFixed(1)}% Confidence
                  </Badge>
                </div>
              </div>

              {/* Probability Distribution */}
              <div className="space-y-1.5 pt-2">
                <div className="text-xs font-semibold text-foreground">
                  Top Probability Distribution:
                </div>
                {classes.map((cls) => {
                  const prob = prediction.probabilities ? prediction.probabilities[cls] || 0 : 0;
                  const isTop = cls === prediction.predicted_class;
                  return (
                    <div key={cls} className="space-y-0.5">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className={isTop ? "font-bold text-foreground" : "text-muted-foreground"}>
                          {cls}
                        </span>
                        <span className={isTop ? "font-bold text-foreground" : "text-muted-foreground"}>
                          {(prob * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isTop ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                          style={{ width: `${Math.max(2, prob * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-muted-foreground font-mono">
              Click any category on the left to run inference...
            </div>
          )}
        </CardContent>
      </div>

      <div className="px-6 py-3 border-t border-border text-[11px] font-mono text-muted-foreground">
        Backend: ModelGuardCNN (PyTorch 2.14) · Endpoint: POST /predict
      </div>
    </Card>
  );
}
