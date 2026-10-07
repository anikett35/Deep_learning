"""
Adaptive Attack Simulation: Clean Data Fine-Tuning.
Evaluates whether an adversary with access to clean unlabelled/labelled data
can remove or weaken the embedded watermark through fine-tuning, without knowing trigger images.
Measures Before vs After clean accuracy and watermark match rate.
"""
import sys
import os
import time
import json
import argparse
import yaml
from pathlib import Path
from typing import Dict, Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ml.utils.reproducibility import set_seed, get_device
from ml.data.dataset import get_dataloaders
from ml.models.model_factory import load_checkpoint, save_checkpoint
from ml.watermark.watermark_dataset import get_trigger_loader
from ml.evaluation.evaluator import evaluate_model_comprehensive, evaluate_watermark_probes


def parse_args():
    parser = argparse.ArgumentParser(description="ModelGuard Adaptive Fine-Tuning Attack")
    parser.add_argument("--epochs", type=int, default=3, help="Fine-tuning epochs")
    parser.add_argument("--lr", type=float, default=0.0002, help="Fine-tuning learning rate")
    parser.add_argument("--batch_size", type=int, default=64, help="Batch size")
    parser.add_argument("--source_thief_budget", type=int, default=1000, help="Source thief model budget")
    parser.add_argument("--fast", action="store_true", help="Fast execution mode")
    return parser.parse_args()


def run_adaptive_finetuning(
    epochs: int = 3,
    lr: float = 0.0002,
    batch_size: int = 64,
    source_budget: int = 1000,
    fast_mode: bool = True,
    device: str = "cpu"
) -> Dict[str, Any]:
    set_seed(42)
    mode = "fast" if fast_mode else "full"
    
    data_dir = PROJECT_ROOT / "artifacts" / "datasets" / "cifar10"
    output_dir = PROJECT_ROOT / "artifacts" / "models" / "adaptive_thief"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    source_thief_path = PROJECT_ROOT / "artifacts" / "models" / "thief" / f"budget_{source_budget}" / "best.pt"
    if not source_thief_path.exists():
        raise FileNotFoundError(f"Source thief checkpoint not found: {source_thief_path}")
        
    triggers_path = PROJECT_ROOT / "artifacts" / "triggers" / "secret_triggers.pt"
    trigger_loader = get_trigger_loader(triggers_path, batch_size=16, shuffle=False)
    
    # Load clean data only
    train_loader, val_loader, test_loader, _ = get_dataloaders(
        data_dir=data_dir,
        mode=mode,
        batch_size=batch_size,
        num_workers=0,
        seed=42
    )
    
    print("\n" + "=" * 65)
    print(f"ModelGuard — Running Adaptive Attack (Clean Fine-Tuning)")
    print(f"Source: ThiefCNN (Budget {source_budget}) | Epochs: {epochs} | LR: {lr} | Clean Data ONLY")
    print("=" * 65)
    
    # Load source thief model
    model, _ = load_checkpoint(source_thief_path, device=device)
    
    # Step 1: Pre-Attack Evaluation
    pre_test_eval = evaluate_model_comprehensive(model, test_loader, device=device)
    pre_wm_eval = evaluate_watermark_probes(model, trigger_loader, device=device)
    
    print(f"[Before Fine-Tuning]")
    print(f"Clean Test Accuracy:        {pre_test_eval['accuracy']*100:.2f}%")
    print(f"Watermark Match Rate:       {pre_wm_eval['match_rate']*100:.2f}% ({pre_wm_eval['k']}/{pre_wm_eval['n']})")
    
    # Step 2: Fine-tune using CLEAN data ONLY
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()
    
    start_time = time.time()
    for ep in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        for inputs, targets, _ in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            _, preds = outputs.max(1)
            correct += preds.eq(targets).sum().item()
            total += targets.size(0)
            
        train_acc = correct / max(total, 1)
        val_eval = evaluate_model_comprehensive(model, val_loader, device=device)
        print(f"Epoch [{ep:02d}/{epochs:02d}] Clean Loss: {running_loss/max(total,1):.4f} Clean Acc: {train_acc*100:.2f}% | Val Acc: {val_eval['accuracy']*100:.2f}%")
        
    duration = time.time() - start_time
    
    # Step 3: Post-Attack Evaluation
    post_test_eval = evaluate_model_comprehensive(model, test_loader, device=device)
    post_wm_eval = evaluate_watermark_probes(model, trigger_loader, device=device)
    
    delta_clean = post_test_eval["accuracy"] - pre_test_eval["accuracy"]
    delta_wm = post_wm_eval["match_rate"] - pre_wm_eval["match_rate"]
    
    print("-" * 65)
    print(f"[After Fine-Tuning Results]")
    print(f"Clean Test Accuracy:        {post_test_eval['accuracy']*100:.2f}% (Delta: {delta_clean*100:+.2f}%)")
    print(f"Watermark Match Rate:       {post_wm_eval['match_rate']*100:.2f}% ({post_wm_eval['k']}/{post_wm_eval['n']}) (Delta: {delta_wm*100:+.2f}%)")
    print(f"Watermark Survival:         {'SURVIVED' if post_wm_eval['k'] >= 20 else 'WEAKENED/REMOVED'}")
    print(f"Fine-Tuning Duration:       {duration:.2f}s")
    print("-" * 65)
    
    # Save checkpoint & metrics
    save_checkpoint(
        model,
        output_dir / "best.pt",
        metadata={
            "source_budget": source_budget,
            "post_clean_acc": post_test_eval["accuracy"],
            "post_wm_rate": post_wm_eval["match_rate"]
        },
        optimizer=optimizer,
        epoch=epochs
    )
    
    results = {
        "experiment_name": "ModelGuard-AdaptiveAttack",
        "source_model": f"ThiefCNN_budget_{source_budget}",
        "fine_tuning_epochs": epochs,
        "learning_rate": lr,
        "clean_samples_used": len(train_loader.dataset),
        "duration_seconds": round(duration, 2),
        "before": {
            "clean_accuracy": float(pre_test_eval["accuracy"]),
            "watermark_match_rate": float(pre_wm_eval["match_rate"]),
            "watermark_matches": int(pre_wm_eval["k"]),
            "total_probes": int(pre_wm_eval["n"])
        },
        "after": {
            "clean_accuracy": float(post_test_eval["accuracy"]),
            "watermark_match_rate": float(post_wm_eval["match_rate"]),
            "watermark_matches": int(post_wm_eval["k"]),
            "total_probes": int(post_wm_eval["n"])
        },
        "deltas": {
            "clean_accuracy_delta": float(delta_clean),
            "watermark_match_rate_delta": float(delta_wm)
        },
        "watermark_survived": bool(post_wm_eval["k"] >= 20)
    }
    
    with open(output_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    # Update system experiment status
    status_file = PROJECT_ROOT / "artifacts" / "experiment_status.json"
    status_data = {}
    if status_file.exists():
        try:
            with open(status_file, "r", encoding="utf-8") as f:
                status_data = json.load(f)
        except Exception:
            pass
    status_data["adaptive_attack"] = "PASS"
    with open(status_file, "w", encoding="utf-8") as f:
        json.dump(status_data, f, indent=2)
        
    return results


def main():
    args = parse_args()
    device = get_device()
    run_adaptive_finetuning(
        epochs=args.epochs,
        lr=args.lr,
        batch_size=args.batch_size,
        source_budget=args.source_thief_budget,
        fast_mode=args.fast,
        device=str(device)
    )


if __name__ == "__main__":
    main()
