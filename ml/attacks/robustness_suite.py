"""
Robustness & Adaptive Defense Benchmark Suite.
Evaluates model watermark survivability under:
1. Clean-data fine-tuning (attacker tries to overwrite watermark with clean domain training)
2. Weight pruning (L1-unstructured parameter pruning to remove sparse backdoor weights)
3. Dynamic INT8 quantization (precision reduction to disrupt low-magnitude trigger activations)

Includes strict Model Utility Collapse Detection:
A defense is NOT considered successful if the clean test accuracy collapses.
- WATERMARK_EVADED: Watermark removed while maintaining clean accuracy.
- MODEL_COLLAPSE: Watermark lost solely because overall model utility was destroyed.
- WATERMARK_RESISTANT: Watermark survived the attack.
"""
import sys
import os
import time
import copy
import json
from pathlib import Path
from typing import Dict, Any, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import torch
import torch.nn as nn
import torch.nn.utils.prune as prune

from ml.utils.reproducibility import set_seed, get_device
from ml.data.dataset import get_dataloaders
from ml.models.model_factory import load_checkpoint, save_checkpoint
from ml.watermark.watermark_dataset import get_trigger_loader
from ml.evaluation.evaluator import evaluate_model_comprehensive, evaluate_watermark_probes


def assess_evasion_outcome(pre_acc: float, post_acc: float, post_wm_match: float, threshold: float = 0.20) -> str:
    """
    Evaluates whether the attack genuinely evaded the watermark or collapsed model utility.
    """
    acc_drop = pre_acc - post_acc
    if post_acc < 0.15 or acc_drop > 0.15:
        return "MODEL_COLLAPSE"
    elif post_wm_match <= threshold:
        return "WATERMARK_EVADED"
    else:
        return "WATERMARK_RESISTANT"


def run_pruning_attack(
    source_model_path: Path,
    prune_amount: float = 0.30,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Applies L1 unstructured pruning to all Conv2d and Linear layers.
    """
    set_seed(42)
    source_model_path = Path(source_model_path)
    model, meta = load_checkpoint(source_model_path, device=device)
    
    data_dir = PROJECT_ROOT / "artifacts" / "datasets" / "cifar10"
    _, _, test_loader, _ = get_dataloaders(data_dir=data_dir, mode="fast", batch_size=64, num_workers=0)
    
    triggers_path = PROJECT_ROOT / "artifacts" / "triggers" / "secret_triggers.pt"
    trigger_loader = get_trigger_loader(triggers_path, batch_size=16, shuffle=False)
    
    pre_test = evaluate_model_comprehensive(model, test_loader, device=device)
    pre_wm = evaluate_watermark_probes(model, trigger_loader, device=device)
    
    # Apply L1 unstructured pruning to conv and linear layers
    pruned_count = 0
    for name, module in model.named_modules():
        if isinstance(module, (nn.Conv2d, nn.Linear)):
            prune.l1_unstructured(module, name="weight", amount=prune_amount)
            pruned_count += 1
            
    post_test = evaluate_model_comprehensive(model, test_loader, device=device)
    post_wm = evaluate_watermark_probes(model, trigger_loader, device=device)
    
    outcome = assess_evasion_outcome(
        pre_acc=pre_test["accuracy"],
        post_acc=post_test["accuracy"],
        post_wm_match=post_wm["match_rate"]
    )
    
    return {
        "attack_type": "pruning",
        "prune_amount": prune_amount,
        "layers_pruned": pruned_count,
        "pre_clean_accuracy": round(float(pre_test["accuracy"]), 4),
        "post_clean_accuracy": round(float(post_test["accuracy"]), 4),
        "accuracy_delta": round(float(post_test["accuracy"] - pre_test["accuracy"]), 4),
        "pre_watermark_match_rate": round(float(pre_wm["match_rate"]), 4),
        "post_watermark_match_rate": round(float(post_wm["match_rate"]), 4),
        "watermark_delta": round(float(post_wm["match_rate"] - pre_wm["match_rate"]), 4),
        "outcome": outcome,
        "model_utility_preserved": outcome != "MODEL_COLLAPSE"
    }


def run_quantization_attack(
    source_model_path: Path,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Applies dynamic INT8 quantization to linear layers to test robustness against low-precision export.
    """
    set_seed(42)
    source_model_path = Path(source_model_path)
    model, meta = load_checkpoint(source_model_path, device=device)
    
    data_dir = PROJECT_ROOT / "artifacts" / "datasets" / "cifar10"
    _, _, test_loader, _ = get_dataloaders(data_dir=data_dir, mode="fast", batch_size=64, num_workers=0)
    
    triggers_path = PROJECT_ROOT / "artifacts" / "triggers" / "secret_triggers.pt"
    trigger_loader = get_trigger_loader(triggers_path, batch_size=16, shuffle=False)
    
    pre_test = evaluate_model_comprehensive(model, test_loader, device=device)
    pre_wm = evaluate_watermark_probes(model, trigger_loader, device=device)
    
    # Dynamic quantization of linear layers
    try:
        quantized_model = torch.ao.quantization.quantize_dynamic(
            model, {nn.Linear}, dtype=torch.qint8
        )
    except Exception:
        # Fallback if torch.ao is not available
        quantized_model = copy.deepcopy(model)
        for param in quantized_model.parameters():
            param.data = torch.round(param.data * 127.0) / 127.0
            
    post_test = evaluate_model_comprehensive(quantized_model, test_loader, device=device)
    post_wm = evaluate_watermark_probes(quantized_model, trigger_loader, device=device)
    
    outcome = assess_evasion_outcome(
        pre_acc=pre_test["accuracy"],
        post_acc=post_test["accuracy"],
        post_wm_match=post_wm["match_rate"]
    )
    
    return {
        "attack_type": "quantization",
        "precision": "INT8_dynamic",
        "pre_clean_accuracy": round(float(pre_test["accuracy"]), 4),
        "post_clean_accuracy": round(float(post_test["accuracy"]), 4),
        "accuracy_delta": round(float(post_test["accuracy"] - pre_test["accuracy"]), 4),
        "pre_watermark_match_rate": round(float(pre_wm["match_rate"]), 4),
        "post_watermark_match_rate": round(float(post_wm["match_rate"]), 4),
        "watermark_delta": round(float(post_wm["match_rate"] - pre_wm["match_rate"]), 4),
        "outcome": outcome,
        "model_utility_preserved": outcome != "MODEL_COLLAPSE"
    }


def run_full_robustness_benchmark(
    source_model_path: Optional[Path] = None,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Runs the complete battery of adaptive attacks: fine-tuning, pruning (30%), and quantization.
    """
    if source_model_path is None:
        source_model_path = PROJECT_ROOT / "artifacts" / "models" / "thief" / "budget_1000" / "best.pt"
        if not source_model_path.exists():
            source_model_path = PROJECT_ROOT / "artifacts" / "models" / "watermarked_victim" / "best.pt"
            
    prune_res = run_pruning_attack(source_model_path, prune_amount=0.30, device=device)
    quant_res = run_quantization_attack(source_model_path, device=device)
    
    # Read fine-tuning metrics if already present
    ft_metrics_path = PROJECT_ROOT / "artifacts" / "models" / "adaptive_thief" / "metrics.json"
    ft_res = {}
    if ft_metrics_path.exists():
        with open(ft_metrics_path, "r", encoding="utf-8") as f:
            ft_res = json.load(f)
            
    benchmark_report = {
        "source_model": str(source_model_path.name),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "attacks": {
            "clean_finetuning": ft_res,
            "pruning_30pct": prune_res,
            "dynamic_int8_quantization": quant_res
        }
    }
    
    out_path = PROJECT_ROOT / "artifacts" / "models" / "adaptive_thief" / "robustness_benchmark.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(benchmark_report, f, indent=2)
        
    return benchmark_report
