"""
Statistical Watermark Verification Engine.
Performs exact one-sided binomial hypothesis testing using scipy.stats.binomtest.
Tests null hypothesis H0: p <= p0 (default p0 = 0.10 for 10-class CIFAR-10)
against alternative H1: p > p0 at significance level alpha = 0.01.
Generates comprehensive verification results and trigger-response matrix.
"""
import sys
import os
import json
import time
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
import torch
import torch.nn as nn
from scipy.stats import binomtest

from ml.data.preprocess import CIFAR10_CLASSES
from ml.watermark.watermark_dataset import get_trigger_loader
from ml.models.model_factory import load_checkpoint
from ml.evaluation.evaluator import evaluate_watermark_probes


class ModelVerifier:
    """
    Statistically verifies watermark ownership in suspect models.
    """
    def __init__(
        self,
        triggers_path: Optional[Path] = None,
        null_probability: float = 0.10,
        alpha: float = 0.01
    ):
        self.triggers_path = Path(triggers_path or (PROJECT_ROOT / "artifacts" / "triggers" / "secret_triggers.pt"))
        self.p0 = null_probability
        self.alpha = alpha
        
        # Load trigger fingerprint
        manifest_path = PROJECT_ROOT / "artifacts" / "triggers" / "trigger_manifest.json"
        if manifest_path.exists():
            with open(manifest_path, "r", encoding="utf-8") as f:
                m = json.load(f)
                self.trigger_fingerprint = m.get("sha256_fingerprint", "unknown")
                self.trigger_count = m.get("trigger_count", 80)
        else:
            self.trigger_fingerprint = "unknown"
            self.trigger_count = 80

    def verify_model(
        self,
        model: nn.Module,
        model_id: str,
        device: str = "cpu"
    ) -> Dict[str, Any]:
        """
        Executes exact binomial test on model against the secret 80 triggers.
        """
        trigger_loader = get_trigger_loader(self.triggers_path, batch_size=16, shuffle=False)
        wm_eval = evaluate_watermark_probes(model, trigger_loader, device=device)
        
        n = wm_eval["n"]
        k = wm_eval["k"]
        observed_rate = wm_eval["match_rate"]
        
        # Exact one-sided binomial test: P(X >= k | n, p0)
        test_res = binomtest(k=k, n=n, p=self.p0, alternative="greater")
        p_val = float(test_res.pvalue)
        
        is_watermark_detected = bool(p_val < self.alpha)
        decision = "WATERMARK_CONFIRMED" if is_watermark_detected else "WATERMARK_NOT_DETECTED"
        
        result = {
            "model_id": model_id,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "trigger_set_hash": self.trigger_fingerprint,
            "n": int(n),
            "k": int(k),
            "observed_match_rate": round(float(observed_rate), 4),
            "null_probability": float(self.p0),
            "significance_level_alpha": float(self.alpha),
            "exact_p_value": p_val,
            "p_value_scientific": f"{p_val:.2e}",
            "decision": decision,
            "statistical_verdict": (
                f"Statistically significant watermark presence detected (p = {p_val:.2e} < alpha = {self.alpha}). "
                f"Reject H0 with match rate {observed_rate*100:.1f}% ({k}/{n} triggers matching expected target class)."
                if is_watermark_detected else
                f"No statistically significant watermark presence detected (p = {p_val:.4f} >= alpha = {self.alpha}). "
                f"Fail to reject H0."
            ),
            "per_trigger_results": wm_eval["per_trigger_results"]
        }
        return result

    def verify_checkpoint(
        self,
        checkpoint_path: Path,
        model_id: str,
        device: str = "cpu"
    ) -> Dict[str, Any]:
        model, _ = load_checkpoint(checkpoint_path, device=device)
        return self.verify_model(model, model_id=model_id, device=device)


def run_multi_model_verification(
    checkpoints: Dict[str, Path],
    output_dir: Optional[Path] = None,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Verifies multiple candidate models (Baseline, Victim, Thief models).
    Builds the complete trigger-response matrix across all models.
    """
    if output_dir is None:
        output_dir = PROJECT_ROOT / "artifacts" / "verification"
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    verifier = ModelVerifier()
    summary = {
        "verified_models": {},
        "trigger_response_matrix": [],
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    }
    
    model_per_triggers = {}
    
    for model_name, ckpt_path in checkpoints.items():
        ckpt_path = Path(ckpt_path)
        if not ckpt_path.exists():
            print(f"[Verifier] Skipping {model_name}: Checkpoint not found at {ckpt_path}")
            continue
            
        print(f"[Verifier] Running exact statistical verification on {model_name}...")
        v_res = verifier.verify_checkpoint(ckpt_path, model_id=model_name, device=device)
        
        # Save individual verification JSON
        per_trigger_details = v_res.pop("per_trigger_results")
        model_per_triggers[model_name] = per_trigger_details
        
        summary["verified_models"][model_name] = v_res
        
        with open(output_dir / f"verification_{model_name}.json", "w", encoding="utf-8") as f:
            json.dump({**v_res, "per_trigger_results": per_trigger_details}, f, indent=2)
            
        print(f"           Result: {v_res['decision']} | Matches: {v_res['k']}/{v_res['n']} ({v_res['observed_match_rate']*100:.1f}%) | p = {v_res['p_value_scientific']}")
        
    # Build Trigger-Response Matrix
    # Rows: Trigger IDs (trig_001..trig_080)
    # Columns: Models
    model_names = list(model_per_triggers.keys())
    if model_names:
        num_triggers = len(model_per_triggers[model_names[0]])
        matrix = []
        for i in range(num_triggers):
            trig_id = model_per_triggers[model_names[0]][i]["trigger_id"]
            exp_cls = model_per_triggers[model_names[0]][i]["expected_class_name"]
            
            row = {
                "trigger_id": trig_id,
                "expected_target_class": exp_cls,
                "responses": {}
            }
            for m_name in model_names:
                t_info = model_per_triggers[m_name][i]
                row["responses"][m_name] = {
                    "predicted_class": t_info["predicted_class_name"],
                    "matched": t_info["matched"]
                }
            matrix.append(row)
            
        summary["trigger_response_matrix"] = matrix
        
    # Save master watermark results JSON
    master_results_path = output_dir / "watermark_results.json"
    with open(master_results_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        
    # Update system experiment status
    status_file = PROJECT_ROOT / "artifacts" / "experiment_status.json"
    status_data = {}
    if status_file.exists():
        try:
            with open(status_file, "r", encoding="utf-8") as f:
                status_data = json.load(f)
        except Exception:
            pass
    status_data["verification"] = "PASS"
    with open(status_file, "w", encoding="utf-8") as f:
        json.dump(status_data, f, indent=2)
        
    print(f"\n[Verification Suite Complete] Master results saved to: {master_results_path}")
    return summary


if __name__ == "__main__":
    from ml.utils.reproducibility import get_device
    device = get_device()
    
    # Check all candidate models that exist
    checkpoints = {
        "Baseline": PROJECT_ROOT / "artifacts" / "models" / "baseline" / "best.pt",
        "Watermarked_Victim": PROJECT_ROOT / "artifacts" / "models" / "watermarked_victim" / "best.pt",
        "Thief_1000": PROJECT_ROOT / "artifacts" / "models" / "thief" / "budget_1000" / "best.pt",
        "Thief_5000": PROJECT_ROOT / "artifacts" / "models" / "thief" / "budget_5000" / "best.pt",
        "Thief_10000": PROJECT_ROOT / "artifacts" / "models" / "thief" / "budget_10000" / "best.pt",
        "Thief_20000": PROJECT_ROOT / "artifacts" / "models" / "thief" / "budget_20000" / "best.pt",
    }
    
    run_multi_model_verification(checkpoints, device=str(device))
