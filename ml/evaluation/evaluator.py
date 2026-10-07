"""
ModelGuard Unified Evaluation Framework.
Provides standardized evaluation routines across all models:
- Classification metrics: Loss, Accuracy, Weighted Precision, Recall, F1, Confusion Matrix
- Extraction metrics: Victim-Thief Agreement rate, Fidelity
- Watermark metrics: Match Count (k), Total Probes (n), Empirical Match Rate
- Retention metrics: Pre- vs Post-Attack Watermark Retention Delta
"""
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
import torch
import torch.nn as nn

from ml.data.preprocess import CIFAR10_CLASSES
from ml.training.trainer import calculate_metrics_numpy


def evaluate_model_comprehensive(
    model: nn.Module,
    dataloader: torch.utils.data.DataLoader,
    device: str = "cpu",
    criterion: Optional[nn.Module] = None
) -> Dict[str, Any]:
    """
    Standardized evaluation on any DataLoader (clean test, validation, or triggers).
    """
    model.eval()
    if criterion is None:
        criterion = nn.CrossEntropyLoss()
        
    total_loss = 0.0
    correct = 0
    total = 0
    all_preds = []
    all_targets = []
    all_probs = []
    
    with torch.no_grad():
        for batch in dataloader:
            if len(batch) >= 2:
                inputs, targets = batch[0], batch[1]
            else:
                inputs, targets = batch[0], None
                
            inputs = inputs.to(device)
            outputs = model(inputs)
            
            probs = torch.softmax(outputs, dim=1)
            all_probs.extend(probs.cpu().numpy().tolist())
            
            _, predicted = outputs.max(1)
            all_preds.extend(predicted.cpu().numpy().tolist())
            
            if targets is not None:
                targets = targets.to(device)
                loss = criterion(outputs, targets)
                total_loss += loss.item() * inputs.size(0)
                correct += predicted.eq(targets).sum().item()
                total += targets.size(0)
                all_targets.extend(targets.cpu().numpy().tolist())
            else:
                total += inputs.size(0)
                
    avg_loss = total_loss / max(total, 1) if all_targets else 0.0
    accuracy = correct / max(total, 1) if all_targets else 0.0
    
    result = {
        "loss": float(avg_loss),
        "accuracy": float(accuracy),
        "total_samples": int(total),
        "correct": int(correct),
        "predictions": all_preds
    }
    
    if all_targets:
        targets_arr = np.array(all_targets, dtype=int)
        preds_arr = np.array(all_preds, dtype=int)
        class_metrics = calculate_metrics_numpy(targets_arr, preds_arr, num_classes=len(CIFAR10_CLASSES))
        result.update({
            "precision": class_metrics["precision"],
            "recall": class_metrics["recall"],
            "f1": class_metrics["f1"],
            "confusion_matrix": class_metrics["confusion_matrix"]
        })
        
    return result


def calculate_victim_thief_agreement(
    victim_model: nn.Module,
    thief_model: nn.Module,
    dataloader: torch.utils.data.DataLoader,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Computes empirical agreement between victim and thief predictions:
    Agreement = (1 / N) * sum(I[f_victim(x) == f_thief(x)])
    """
    victim_model.eval()
    thief_model.eval()
    
    agreed = 0
    total = 0
    victim_preds = []
    thief_preds = []
    
    with torch.no_grad():
        for batch in dataloader:
            inputs = batch[0].to(device)
            v_out = victim_model(inputs)
            t_out = thief_model(inputs)
            
            _, v_pred = v_out.max(1)
            _, t_pred = t_out.max(1)
            
            agreed += v_pred.eq(t_pred).sum().item()
            total += inputs.size(0)
            
            victim_preds.extend(v_pred.cpu().numpy().tolist())
            thief_preds.extend(t_pred.cpu().numpy().tolist())
            
    agreement_rate = agreed / max(total, 1)
    return {
        "agreement_rate": float(agreement_rate),
        "agreed_count": int(agreed),
        "total_queries": int(total),
        "victim_predictions": victim_preds,
        "thief_predictions": thief_preds
    }


def evaluate_watermark_probes(
    model: nn.Module,
    trigger_loader: torch.utils.data.DataLoader,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Evaluates model against the secret watermark triggers.
    Returns:
    - n: total probes (80)
    - k: matches to expected watermark target class
    - match_rate: k / n
    - per_trigger_results: list of (trigger_id, predicted_class, expected_class, matched)
    """
    model.eval()
    matches = 0
    total = 0
    per_trigger = []
    
    with torch.no_grad():
        for batch in trigger_loader:
            inputs, expected_targets, trigger_ids = batch
            inputs = inputs.to(device)
            outputs = model(inputs)
            _, preds = outputs.max(1)
            
            preds_cpu = preds.cpu().numpy()
            expected_cpu = expected_targets.numpy()
            
            for trig_id, p, exp in zip(trigger_ids, preds_cpu, expected_cpu):
                matched = bool(p == exp)
                if matched:
                    matches += 1
                total += 1
                per_trigger.append({
                    "trigger_id": str(trig_id),
                    "predicted_class_idx": int(p),
                    "predicted_class_name": CIFAR10_CLASSES[p],
                    "expected_class_idx": int(exp),
                    "expected_class_name": CIFAR10_CLASSES[exp],
                    "matched": matched
                })
                
    match_rate = matches / max(total, 1)
    return {
        "n": int(total),
        "k": int(matches),
        "match_rate": float(match_rate),
        "per_trigger_results": per_trigger
    }
