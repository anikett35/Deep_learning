"""
Model Extraction Attack Runner.
Simulates an adversary performing black-box extraction attacks at varying query budgets:
N in {1000, 5000, 10000, 20000}.
Trains a structurally distinct ThiefCNN from scratch using only victim outputs.
Measures thief accuracy, victim-thief agreement, watermark transfer, and logs to MLflow.
"""
import sys
import os
import time
import json
import argparse
import yaml
from pathlib import Path
from typing import Dict, Any, List

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split

from ml.utils.reproducibility import set_seed, get_device
from ml.data.dataset import get_dataloaders
from ml.models.thief_cnn import ThiefCNN
from ml.models.model_factory import load_checkpoint, save_checkpoint
from ml.watermark.watermark_dataset import get_trigger_loader
from ml.extraction.query_generator import get_extraction_queries
from ml.extraction.dataset_collector import collect_stolen_dataset, StolenDataset
from ml.evaluation.evaluator import (
    evaluate_model_comprehensive,
    calculate_victim_thief_agreement,
    evaluate_watermark_probes
)


def parse_args():
    parser = argparse.ArgumentParser(description="ModelGuard Black-Box Model Extraction Runner")
    parser.add_argument("--budget", type=int, default=1000, help="Query budget (e.g. 1000, 5000, 10000, 20000)")
    parser.add_argument("--all_budgets", action="store_true", help="Run full suite across 1k, 5k, 10k, 20k")
    parser.add_argument("--fast", action="store_true", help="Fast execution mode with reduced epochs")
    parser.add_argument("--epochs", type=int, default=None, help="Override training epochs for thief")
    parser.add_argument("--batch_size", type=int, default=64, help="Batch size for thief training")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate for thief")
    return parser.parse_args()


def run_single_extraction(
    budget: int,
    fast_mode: bool = False,
    epochs_override: int = None,
    batch_size: int = 64,
    lr: float = 0.001,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Executes an end-to-end extraction attack for a specified query budget.
    """
    set_seed(42)
    mode = "fast" if fast_mode else "full"
    
    data_dir = PROJECT_ROOT / "artifacts" / "datasets" / "cifar10"
    splits_path = PROJECT_ROOT / "artifacts" / "datasets" / f"splits_{mode}.json"
    extraction_artifacts = PROJECT_ROOT / "artifacts" / "extraction"
    thief_models_dir = PROJECT_ROOT / "artifacts" / "models" / "thief" / f"budget_{budget}"
    thief_models_dir.mkdir(parents=True, exist_ok=True)
    
    epochs = epochs_override if epochs_override is not None else (3 if fast_mode else 15)
    
    print("\n" + "=" * 65)
    print(f"ModelGuard — Running Black-Box Extraction Attack [Budget: {budget} Queries | {mode.upper()}]")
    print(f"Device: {device} | Epochs: {epochs} | Batch: {batch_size} | Architecture: ThiefCNN")
    print("=" * 65)
    
    # Step 1: Sample query pool
    queries = get_extraction_queries(
        data_dir=data_dir,
        splits_path=splits_path,
        budget=budget,
        seed=42
    )
    actual_queries = len(queries)
    
    # Step 2: Query victim API & collect stolen dataset
    stolen_file = extraction_artifacts / f"stolen_dataset_{budget}.pt"
    if not stolen_file.exists():
        collect_stolen_dataset(queries=queries, budget=budget, output_dir=extraction_artifacts)
    else:
        print(f"[Extraction] Using existing stolen dataset: {stolen_file}")
        
    stolen_ds = StolenDataset(stolen_file)
    
    # Split stolen data 85% train / 15% validation
    train_size = int(0.85 * len(stolen_ds))
    val_size = len(stolen_ds) - train_size
    train_subset, val_subset = random_split(
        stolen_ds,
        [train_size, val_size],
        generator=torch.Generator().manual_seed(42)
    )
    
    train_loader = DataLoader(train_subset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_subset, batch_size=batch_size, shuffle=False, num_workers=0)
    
    # Load clean test set for benchmark evaluation
    _, _, test_loader, _ = get_dataloaders(data_dir=data_dir, mode=mode, batch_size=batch_size, num_workers=0, seed=42)
    
    # Step 3: Initialize fresh ThiefCNN (heterogeneous topology)
    thief_model = ThiefCNN(num_classes=10).to(device)
    optimizer = torch.optim.Adam(thief_model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()
    
    # Step 4: Train ThiefCNN strictly from scratch on victim predictions
    start_train_time = time.time()
    best_val_loss = float("inf")
    
    print(f"[Thief Training] Training ThiefCNN from scratch for {epochs} epochs...")
    for ep in range(1, epochs + 1):
        thief_model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = thief_model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            _, preds = outputs.max(1)
            correct += preds.eq(targets).sum().item()
            total += targets.size(0)
            
        train_acc = correct / max(total, 1)
        val_eval = evaluate_model_comprehensive(thief_model, val_loader, device=device, criterion=criterion)
        
        if val_eval["loss"] < best_val_loss:
            best_val_loss = val_eval["loss"]
            save_checkpoint(
                thief_model,
                thief_models_dir / "best.pt",
                metadata={"budget": budget, "epoch": ep, "val_loss": val_eval["loss"], "val_acc": val_eval["accuracy"]},
                optimizer=optimizer,
                epoch=ep
            )
            
        print(f"Epoch [{ep:02d}/{epochs:02d}] Train Loss: {running_loss/max(total,1):.4f} Acc: {train_acc*100:.2f}% | Val Loss: {val_eval['loss']:.4f} Acc: {val_eval['accuracy']*100:.2f}%")
        
    training_time = time.time() - start_train_time
    save_checkpoint(
        thief_model,
        thief_models_dir / "last.pt",
        metadata={"budget": budget, "epoch": epochs},
        optimizer=optimizer,
        epoch=epochs
    )
    
    # Step 5: Evaluate Thief vs Victim
    best_thief, _ = load_checkpoint(thief_models_dir / "best.pt", device=device)
    thief_test_eval = evaluate_model_comprehensive(best_thief, test_loader, device=device)
    
    victim_path = PROJECT_ROOT / "artifacts" / "models" / "watermarked_victim" / "best.pt"
    victim_model, _ = load_checkpoint(victim_path, device=device)
    victim_test_eval = evaluate_model_comprehensive(victim_model, test_loader, device=device)
    
    # Compute Victim-Thief Agreement
    agreement_results = calculate_victim_thief_agreement(victim_model, best_thief, test_loader, device=device)
    
    # Evaluate Watermark Transfer to Thief
    triggers_file = PROJECT_ROOT / "artifacts" / "triggers" / "secret_triggers.pt"
    trigger_loader = get_trigger_loader(triggers_file, batch_size=16, shuffle=False)
    thief_wm_eval = evaluate_watermark_probes(best_thief, trigger_loader, device=device)
    victim_wm_eval = evaluate_watermark_probes(victim_model, trigger_loader, device=device)
    
    print("-" * 65)
    print(f"[Extraction Results — Budget {budget}]")
    print(f"Victim Clean Test Accuracy:       {victim_test_eval['accuracy']*100:.2f}%")
    print(f"Thief Clean Test Accuracy:        {thief_test_eval['accuracy']*100:.2f}%")
    print(f"Victim-Thief Agreement (Fidelity):{agreement_results['agreement_rate']*100:.2f}%")
    print(f"Watermark Transfer to Thief:      {thief_wm_eval['match_rate']*100:.2f}% ({thief_wm_eval['k']}/{thief_wm_eval['n']})")
    print(f"Victim Watermark Retention:       {victim_wm_eval['match_rate']*100:.2f}% ({victim_wm_eval['k']}/{victim_wm_eval['n']})")
    print(f"Thief Training Time:              {training_time:.2f}s")
    print("-" * 65)
    
    result_metrics = {
        "budget": budget,
        "actual_queries": actual_queries,
        "thief_architecture": "ThiefCNN",
        "training_time_seconds": round(training_time, 2),
        "thief_clean_test_accuracy": float(thief_test_eval["accuracy"]),
        "victim_clean_test_accuracy": float(victim_test_eval["accuracy"]),
        "victim_thief_agreement": float(agreement_results["agreement_rate"]),
        "thief_watermark_match_rate": float(thief_wm_eval["match_rate"]),
        "thief_watermark_matches": int(thief_wm_eval["k"]),
        "victim_watermark_match_rate": float(victim_wm_eval["match_rate"]),
        "total_watermark_probes": int(thief_wm_eval["n"]),
        "confusion_matrix": thief_test_eval["confusion_matrix"],
        "checkpoint_path": str(thief_models_dir / "best.pt")
    }
    
    with open(thief_models_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(result_metrics, f, indent=2)
        
    config_dict = {
        "budget": budget,
        "epochs": epochs,
        "batch_size": batch_size,
        "learning_rate": lr,
        "architecture": "ThiefCNN",
        "random_seed": 42
    }
    with open(thief_models_dir / "config.yaml", "w", encoding="utf-8") as f:
        yaml.dump(config_dict, f)
        
    # Update system experiment status
    status_file = PROJECT_ROOT / "artifacts" / "experiment_status.json"
    status_data = {}
    if status_file.exists():
        try:
            with open(status_file, "r", encoding="utf-8") as f:
                status_data = json.load(f)
        except Exception:
            pass
    status_data[f"extraction_{budget}"] = "PASS"
    with open(status_file, "w", encoding="utf-8") as f:
        json.dump(status_data, f, indent=2)
        
    return result_metrics


def main():
    args = parse_args()
    device = get_device()
    
    budgets = [1000, 5000, 10000, 20000] if args.all_budgets else [args.budget]
    all_results = {}
    
    summary_path = PROJECT_ROOT / "artifacts" / "extraction" / "extraction_summary.json"
    if summary_path.exists():
        try:
            with open(summary_path, "r", encoding="utf-8") as f:
                all_results = json.load(f)
        except Exception:
            all_results = {}
            
    for b in budgets:
        res = run_single_extraction(
            budget=b,
            fast_mode=args.fast,
            epochs_override=args.epochs,
            batch_size=args.batch_size,
            lr=args.lr,
            device=str(device)
        )
        all_results[str(b)] = res
        
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)
        
    print(f"\n[Extraction Suite Complete] Summary written to: {summary_path}")


if __name__ == "__main__":
    main()
