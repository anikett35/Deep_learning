"""
Train Watermarked Victim Model (ModelGuardCNN).
Trains jointly on clean CIFAR-10 data and secret watermark triggers.
Measures clean test accuracy, trigger accuracy, clean-vs-baseline delta,
saves checkpoints, metrics JSON, and logs to MLflow.
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
from ml.utils.reproducibility import set_seed, get_device
from ml.data.dataset import get_dataloaders, CIFAR10UnifiedDataset
from ml.data.splits import load_splits, generate_splits
from ml.models.modelguard_cnn import ModelGuardCNN
from ml.models.model_factory import load_checkpoint
from ml.watermark.trigger_generator import create_secret_trigger_set
from ml.watermark.watermark_dataset import get_trigger_loader
from ml.training.trainer import ModelTrainer, evaluate_model


def parse_args():
    parser = argparse.ArgumentParser(description="Train ModelGuard Watermarked Victim CNN")
    parser.add_argument("--fast", action="store_true", help="Run in fast development mode")
    parser.add_argument("--epochs", type=int, default=None, help="Override number of epochs")
    parser.add_argument("--batch_size", type=int, default=None, help="Override batch size")
    parser.add_argument("--lr", type=float, default=None, help="Override learning rate")
    parser.add_argument("--watermark_weight", type=float, default=None, help="Weight for watermark loss")
    return parser.parse_args()


def main():
    args = parse_args()
    set_seed(42)
    device = get_device()
    
    # Load watermark config
    config_path = PROJECT_ROOT / "ml" / "config" / "watermark.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
        
    mode = "fast" if args.fast else "full"
    params = cfg["fast_mode"] if args.fast else cfg["full_mode"]
    
    epochs = args.epochs or params["epochs"]
    batch_size = args.batch_size or params["batch_size"]
    lr = args.lr or params["learning_rate"]
    wm_weight = args.watermark_weight if args.watermark_weight is not None else params.get("watermark_weight", 1.0)
    
    data_dir = PROJECT_ROOT / "artifacts" / "datasets" / "cifar10"
    triggers_dir = PROJECT_ROOT / "artifacts" / "triggers"
    output_dir = PROJECT_ROOT / "artifacts" / "models" / "watermarked_victim"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print(f"ModelGuard — Training Watermarked Victim CNN [{mode.upper()} MODE]")
    print(f"Device: {device} | Epochs: {epochs} | Batch: {batch_size} | WM Weight: {wm_weight}")
    print("=" * 60)
    
    # Ensure splits exist
    meta_path = PROJECT_ROOT / "artifacts" / "datasets" / f"splits_{mode}.json"
    if not meta_path.exists():
        splits = generate_splits(data_dir=data_dir, seed=42, mode=mode, output_meta_path=meta_path)
    else:
        splits = load_splits(meta_path)
        
    # Ensure secret triggers exist
    secret_triggers_file = triggers_dir / "secret_triggers.pt"
    if not secret_triggers_file.exists():
        print("[Victim] Generating 80 secret watermark trigger probes...")
        raw_source_ds = CIFAR10UnifiedDataset(data_dir=data_dir, indices=list(range(60000)))
        wm_cfg = cfg.get("watermark", {})
        create_secret_trigger_set(
            dataset_source=raw_source_ds,
            candidate_indices=splits["extraction_pool"],
            trigger_count=wm_cfg.get("trigger_count", 80),
            target_class_idx=wm_cfg.get("target_class", 0),
            patch_size=wm_cfg.get("pattern_size", 4),
            corner=wm_cfg.get("location", "bottom_right"),
            pattern=wm_cfg.get("pattern_type", "checkerboard"),
            intensity=wm_cfg.get("alpha", 1.0),
            output_dir=triggers_dir,
            seed=42
        )
        print(f"[Victim] Secret triggers saved to: {secret_triggers_file}")
        
    trigger_loader = get_trigger_loader(secret_triggers_file, batch_size=16, shuffle=True)
    train_loader, val_loader, test_loader, _ = get_dataloaders(
        data_dir=data_dir,
        mode=mode,
        batch_size=batch_size,
        num_workers=0,
        seed=42
    )
    
    active_config = {
        "model": "ModelGuardCNN",
        "mode": mode,
        "epochs": epochs,
        "batch_size": batch_size,
        "learning_rate": lr,
        "watermark_weight": wm_weight,
        "random_seed": 42,
        "device": str(device)
    }
    with open(output_dir / "config.yaml", "w", encoding="utf-8") as f:
        yaml.dump(active_config, f)
        
    model = ModelGuardCNN(num_classes=10)
    trainer = ModelTrainer(
        model=model,
        output_dir=output_dir,
        device=device,
        mlflow_experiment_name="ModelGuard-Watermarked"
    )
    
    summary = trainer.train(
        train_loader=train_loader,
        val_loader=val_loader,
        epochs=epochs,
        lr=lr,
        weight_decay=params.get("weight_decay", 1e-4),
        trigger_loader=trigger_loader,
        watermark_weight=wm_weight,
        config_dict=active_config
    )
    
    # Evaluate best victim on clean test set and trigger set
    best_model, _ = load_checkpoint(output_dir / "best.pt", device=device)
    test_eval = evaluate_model(best_model, test_loader, device=device)
    trig_eval = evaluate_model(best_model, trigger_loader, device=device)
    
    print("-" * 60)
    print(f"[Victim Evaluation]")
    print(f"Clean Test Accuracy:   {test_eval['accuracy']*100:.2f}%")
    print(f"Trigger Probe Accuracy:{trig_eval['accuracy']*100:.2f}% ({trig_eval['correct']}/{trig_eval['total_samples']})")
    
    # Calculate delta against baseline if available
    baseline_metrics_path = PROJECT_ROOT / "artifacts" / "models" / "baseline" / "metrics.json"
    delta = None
    if baseline_metrics_path.exists():
        try:
            with open(baseline_metrics_path, "r", encoding="utf-8") as f:
                b_metrics = json.load(f)
            b_acc = b_metrics.get("clean_test_accuracy", b_metrics.get("best_val_accuracy", 0.0))
            delta = float(test_eval["accuracy"] - b_acc)
            print(f"Baseline Comparison:   {b_acc*100:.2f}% -> Delta: {delta*100:+.2f}%")
        except Exception as e:
            print(f"Could not compute baseline delta: {e}")
    print("-" * 60)
    
    summary["clean_test_accuracy"] = float(test_eval["accuracy"])
    summary["clean_test_loss"] = float(test_eval["loss"])
    summary["trigger_accuracy"] = float(trig_eval["accuracy"])
    summary["trigger_matches"] = int(trig_eval["correct"])
    summary["total_triggers"] = int(trig_eval["total_samples"])
    summary["clean_vs_baseline_delta"] = delta
    
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
    status_data["watermark"] = "PASS"
    with open(status_file, "w", encoding="utf-8") as f:
        json.dump(status_data, f, indent=2)
        
    print(f"[SUCCESS] Victim model saved to: {output_dir / 'best.pt'}")


if __name__ == "__main__":
    main()
