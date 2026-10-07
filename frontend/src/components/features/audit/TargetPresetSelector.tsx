"use client";

import { TargetPreset } from "@/types/audit";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TargetPresetSelectorProps {
  presets: TargetPreset[];
  selectedTarget: string;
  onSelectTarget: (id: string) => void;
  customUrl: string;
  onChangeCustomUrl: (url: string) => void;
}

export function TargetPresetSelector({
  presets,
  selectedTarget,
  onSelectTarget,
  customUrl,
  onChangeCustomUrl,
}: TargetPresetSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {presets.map((preset) => {
          const isSelected = selectedTarget === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectTarget(preset.id)}
              className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                isSelected
                  ? "border-primary bg-secondary/80 shadow-xs ring-1 ring-primary"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">{preset.name}</span>
                <Badge variant={preset.badgeVariant} className="text-[10px] font-mono font-bold">
                  {preset.badge}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {preset.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Remote Endpoint */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => onSelectTarget("custom")}
          className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
            selectedTarget === "custom"
              ? "border-primary bg-secondary/80 shadow-xs ring-1 ring-primary"
              : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
          }`}
        >
          <div>
            <span className="font-semibold text-sm text-foreground">
              Audit Remote Custom API Endpoint
            </span>
            <div className="text-xs text-muted-foreground mt-0.5">
              Interrogate any external API endpoint (POST /predict) via HTTP.
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono font-bold">
            REMOTE HTTP
          </Badge>
        </button>

        {selectedTarget === "custom" && (
          <div className="mt-3 flex gap-2">
            <Input
              type="text"
              value={customUrl}
              onChange={(e) => onChangeCustomUrl(e.target.value)}
              placeholder="https://api.suspect-model.com/v1/predict"
              className="font-mono text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
