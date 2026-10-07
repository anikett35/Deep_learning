import { TargetPreset } from "@/types/audit";

export const AUDIT_PRESETS: TargetPreset[] = [
  {
    id: "victim",
    name: "Watermarked Victim (Ours)",
    badge: "PROTECTED ORIGIN",
    badgeVariant: "info",
    description: "Proprietary model trained with embedded secret trigger probes.",
  },
  {
    id: "thief_1000",
    name: "Stolen Thief Model (1k Queries)",
    badge: "STOLEN REPLICA",
    badgeVariant: "danger",
    description: "Substitute model trained purely on 1,000 black-box query pairs. Inherited the watermark.",
  },
  {
    id: "adaptive",
    name: "Adaptive Thief (Fine-Tuned)",
    badge: "EVASION ATTEMPT",
    badgeVariant: "warning",
    description: "Attacker fine-tuned on clean data to erase quirks. Demonstrates defense persistence.",
  },
  {
    id: "clean",
    name: "Clean Baseline Model",
    badge: "CONTROL GROUP",
    badgeVariant: "success",
    description: "Independently trained baseline model with no watermark. Verifies zero false-positives.",
  },
];
