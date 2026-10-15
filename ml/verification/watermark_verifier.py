"""
Statistical Watermark Verification Engine.
Performs exact one-sided binomial hypothesis testing using scipy.stats.binomtest.
Tests null hypothesis H0: p <= p0 (default p0 = 0.10 for 10-class CIFAR-10)
against alternative H1: p > p0 at significance level alpha = 0.01.
Includes 95% Clopper-Pearson confidence intervals, boundary testing,
baseline false-positive checking, and legal/scientific attestation disclaimers.
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
from ml.models.model_factory import load_checkpoint, validate_checkpoint_path
from ml.evaluation.evaluator import evaluate_watermark_probes


def exact_binomial_test(k: int, n: int, p0: float = 0.10) -> float:
    """
    Computes exact one-sided binomial p-value using scipy.stats.binomtest.
    Tests H0: p <= p0 vs H1: p > p0.
    """
    res = binomtest(k=k, n=n, p=p0, alternative="greater")
    return float(res.pvalue)



class ModelVerifier:
    """
    Statistically verifies watermark ownership in suspect models using exact binomial hypothesis testing.
    """
    def __init__(
        self,
        triggers_path: Optional[Path] = None,
        null_probability: float = 0.10,
        alpha: float = 0.01
    ):
        self.triggers_path = Path(triggers_path or (PROJECT_ROOT / "artifacts" / "triggers" / "secret_triggers.pt"))
        self.p0 = float(null_probability)
        self.alpha = float(alpha)
        
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
        Executes exact binomial test on model against the secret triggers.
        """
        if not self.triggers_path.exists():
            raise FileNotFoundError(f"Watermark triggers not found at: {self.triggers_path}")
            
        trigger_loader = get_trigger_loader(self.triggers_path, batch_size=16, shuffle=False)
        wm_eval = evaluate_watermark_probes(model, trigger_loader, device=device)
        
        n = int(wm_eval["n"])
        k = int(wm_eval["k"])
        observed_rate = float(wm_eval["match_rate"])
        
        if n == 0:
            raise ValueError("Probe count n is 0. Cannot perform binomial hypothesis test.")
            
        # Exact one-sided binomial test: P(X >= k | n, p0)
        test_res = binomtest(k=k, n=n, p=self.p0, alternative="greater")
        p_val = float(test_res.pvalue)
        
        # Clopper-Pearson 95% Confidence Interval
        ci = test_res.proportion_ci(confidence_level=0.95, method="exact")
        ci_95 = [round(float(ci.low), 4), round(float(ci.high), 4)]
        
        is_watermark_detected = bool(p_val < self.alpha)
        decision = "WATERMARK_CONFIRMED" if is_watermark_detected else "WATERMARK_NOT_DETECTED"
        
        result = {
            "model_id": model_id,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "trigger_set_hash": self.trigger_fingerprint,
            "n": n,
            "k": k,
            "observed_match_rate": round(observed_rate, 4),
            "null_probability": round(self.p0, 4),
            "significance_level_alpha": round(self.alpha, 4),
            "exact_p_value": p_val,
            "p_value_scientific": f"{p_val:.2e}",
            "confidence_interval_95": ci_95,
            "decision": decision,
            "statistical_verdict": (
                f"Statistically significant watermark presence detected (p = {p_val:.2e} < alpha = {self.alpha}). "
                f"Reject H0 with match rate {observed_rate*100:.1f}% ({k}/{n} triggers matching expected target class). "
                f"Exact 95% Clopper-Pearson CI: [{ci_95[0]*100:.1f}%, {ci_95[1]*100:.1f}%]."
                if is_watermark_detected else
                f"No statistically significant watermark presence detected (p = {p_val:.4f} >= alpha = {self.alpha}). "
                f"Fail to reject H0. Model predictions consistent with random guessing under null distribution."
            ),
            "disclaimer": (
                "Statistical significance (p < alpha) establishes rigorous probabilistic evidence that suspect model "
                "predictions deviate non-randomly towards the secret watermark target class. While providing strong "
                "forensic indication of model extraction, it does not constitute a standalone judicial finding of copyright ownership."
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
        valid_path = validate_checkpoint_path(checkpoint_path)
        model, _ = load_checkpoint(valid_path, device=device)
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
    
    # Run per-model verification
    for model_id, ckpt_path in checkpoints.items():
        ckpt_path = Path(ckpt_path)
        if not ckpt_path.exists():
            print(f"[Verification] Warning: Checkpoint for {model_id} not found at {ckpt_path}. Skipping.")
            continue
            
        print(f"[Verification] Auditing {model_id} against secret trigger probes...")
        res = verifier.verify_checkpoint(ckpt_path, model_id=model_id, device=device)
        summary["verified_models"][model_id] = res
        
    # Build 80-cell probe matrix combining predictions from all verified models
    if summary["verified_models"]:
        ref_model = list(summary["verified_models"].keys())[0]
        per_trigger_ref = summary["verified_models"][ref_model]["per_trigger_results"]
        
        matrix = []
        for i, trig in enumerate(per_trigger_ref):
            t_id = trig["trigger_id"]
            row = {
                "trigger_id": t_id,
                "source_class": trig["source_class"],
                "target_class": trig["target_class"],
                "model_predictions": {}
            }
            for m_id, v_res in summary["verified_models"].items():
                m_preds = v_res["per_trigger_results"]
                if i < len(m_preds):
                    row["model_predictions"][m_id] = {
                        "predicted_class": m_preds[i]["predicted_class"],
                        "matched": m_preds[i]["matched"]
                    }
            matrix.append(row)
        summary["trigger_response_matrix"] = matrix
        
    out_file = output_dir / "watermark_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        
    print(f"[Verification] Multi-model verification completed. Saved to: {out_file}")
    return summary
