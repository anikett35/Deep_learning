"""
Train Baseline Model (Control Experiment).
Trains clean BaselineCNN on CIFAR-10 without watermarking.
Generates baseline accuracy, best.pt, metrics.json, and MLflow run.
"""
import sys
import os
import argparse
import yaml
import json
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import torch
from ml.utils.reproducibility import set_seed, get_device, get_experiment_metadata
from ml.data.dataset import get_dataloaders
from ml.models.baseline_cnn import BaselineCNN
from ml.training.trainer import ModelTrainer, evaluate_model


def parse_args():
    parser = argparse.ArgumentParser(description="Train ModelGuard Baseline CNN")
    parser.add_argument("--fast", action="store_true", help="Run in fast development mode")
    parser.add_argument("--epochs", type=int, default=None, help="Override number of epochs")
    parser.add_argument("--batch_size", type=int, default=None, help="Override batch size")
    parser.add_argument("--lr", type=float, default=None, help="Override learning rate")
    return parser.parse_args()


def main():
    args = parse_args()
    set_seed(42)
    device = get_device()
    
    # Load configuration
    config_path = PROJECT_ROOT / "ml" / "config" / "baseline.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
        
    mode = "fast" if args.fast else "full"
    params = cfg["fast_mode"] if args.fast else cfg["full_mode"]
    
    epochs = args.epochs or params["epochs"]
    batch_size = args.batch_size or params["batch_size"]
    lr = args.lr or params["learning_rate"]
    
    data_dir = PROJECT_ROOT / "artifacts" / "datasets" / "cifar10"
    output_dir = PROJECT_ROOT / "artifacts" / "models" / "baseline"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print(f"ModelGuard — Training Baseline CNN [{mode.upper()} MODE]")
    print(f"Device: {device} | Epochs: {epochs} | Batch Size: {batch_size} | LR: {lr}")
    print("=" * 60)
    
    # Save active config
    active_config = {
        "model": "BaselineCNN",
        "mode": mode,
        "epochs": epochs,
        "batch_size": batch_size,
        "learning_rate": lr,
        "weight_decay": params.get("weight_decay", 1e-4),
        "random_seed": 42,
        "device": str(device)
    }
    with open(output_dir / "config.yaml", "w", encoding="utf-8") as f:
        yaml.dump(active_config, f)
        
    train_loader, val_loader, test_loader, splits = get_dataloaders(
        data_dir=data_dir,
        mode=mode,
        batch_size=batch_size,
        num_workers=0,
        seed=42
    )
    
    model = BaselineCNN(num_classes=10)
    trainer = ModelTrainer(
        model=model,
        output_dir=output_dir,
        device=device,
        mlflow_experiment_name="ModelGuard-Baseline"
    )
    
    summary = trainer.train(
        train_loader=train_loader,
        val_loader=val_loader,
        epochs=epochs,
        lr=lr,
        weight_decay=params.get("weight_decay", 1e-4),
        config_dict=active_config
    )
    
    # Evaluate best model on clean test set
    from ml.models.model_factory import load_checkpoint
    best_model, _ = load_checkpoint(output_dir / "best.pt", device=device)
    test_eval = evaluate_model(best_model, test_loader, device=device)
    
    print("-" * 60)
    print(f"[Baseline] Clean Test Accuracy: {test_eval['accuracy']*100:.2f}% | Loss: {test_eval['loss']:.4f}")
    print("-" * 60)
    
    summary["clean_test_accuracy"] = float(test_eval["accuracy"])
    summary["clean_test_loss"] = float(test_eval["loss"])
    summary["clean_test_f1"] = float(test_eval["f1"])
    
    with open(output_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        
    # Update experiment status
    status_file = PROJECT_ROOT / "artifacts" / "experiment_status.json"
    status_data = {}
    if status_file.exists():
        try:
            with open(status_file, "r", encoding="utf-8") as f:
                status_data = json.load(f)
        except Exception:
            pass
    status_data["baseline"] = "PASS"
    with open(status_file, "w", encoding="utf-8") as f:
        json.dump(status_data, f, indent=2)
        
    print(f"[SUCCESS] Baseline model saved to: {output_dir / 'best.pt'}")


if __name__ == "__main__":
    main()
