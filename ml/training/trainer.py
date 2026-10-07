"""
Unified Deep Learning Trainer for ModelGuard.
Supports standard training, watermarking joint training, thief training,
pure NumPy confusion matrix calculation, best-checkpoint selection, and MLflow logging.
Memory-optimized for Windows environments without heavy C++ DLL loads.
"""
import os
import sys
import json
import time
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, Callable
import numpy as np
import torch
import torch.nn as nn

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def calculate_metrics_numpy(y_true: np.ndarray, y_pred: np.ndarray, num_classes: int = 10) -> Dict[str, Any]:
    """
    Computes confusion matrix, weighted precision, recall, and F1 using pure NumPy.
    Avoids loading heavy scikit-learn DLLs to keep memory footprint minimal.
    """
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        if 0 <= t < num_classes and 0 <= p < num_classes:
            cm[t, p] += 1
            
    tp = np.diag(cm)
    fp = np.sum(cm, axis=0) - tp
    fn = np.sum(cm, axis=1) - tp
    support = np.sum(cm, axis=1)
    
    prec_per_class = np.zeros(num_classes)
    rec_per_class = np.zeros(num_classes)
    f1_per_class = np.zeros(num_classes)
    
    for c in range(num_classes):
        denom_p = tp[c] + fp[c]
        prec_per_class[c] = tp[c] / denom_p if denom_p > 0 else 0.0
        
        denom_r = tp[c] + fn[c]
        rec_per_class[c] = tp[c] / denom_r if denom_r > 0 else 0.0
        
        denom_f1 = prec_per_class[c] + rec_per_class[c]
        if denom_f1 > 0:
            f1_per_class[c] = 2.0 * (prec_per_class[c] * rec_per_class[c]) / denom_f1
        else:
            f1_per_class[c] = 0.0
            
    total_samples = np.sum(support)
    if total_samples > 0:
        weighted_prec = float(np.sum(prec_per_class * support) / total_samples)
        weighted_rec = float(np.sum(rec_per_class * support) / total_samples)
        weighted_f1 = float(np.sum(f1_per_class * support) / total_samples)
    else:
        weighted_prec, weighted_rec, weighted_f1 = 0.0, 0.0, 0.0
        
    return {
        "confusion_matrix": cm.tolist(),
        "precision": weighted_prec,
        "recall": weighted_rec,
        "f1": weighted_f1
    }


def evaluate_model(
    model: nn.Module,
    dataloader: torch.utils.data.DataLoader,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Evaluates model on dataloader.
    Returns: loss, accuracy, precision, recall, f1, confusion_matrix.
    """
    model.eval()
    criterion = nn.CrossEntropyLoss()
    total_loss = 0.0
    correct = 0
    total = 0
    
    all_preds = []
    all_targets = []
    
    with torch.no_grad():
        for batch in dataloader:
            if len(batch) == 3:
                inputs, targets, _ = batch
            else:
                inputs, targets = batch[0], batch[1]
                
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            
            total_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            correct += predicted.eq(targets).sum().item()
            total += targets.size(0)
            
            all_preds.extend(predicted.cpu().numpy())
            all_targets.extend(targets.cpu().numpy())
            
    avg_loss = total_loss / max(total, 1)
    accuracy = correct / max(total, 1)
    
    all_preds = np.array(all_preds, dtype=int)
    all_targets = np.array(all_targets, dtype=int)
    
    metrics = calculate_metrics_numpy(all_targets, all_preds, num_classes=10)
    
    return {
        "loss": float(avg_loss),
        "accuracy": float(accuracy),
        "precision": metrics["precision"],
        "recall": metrics["recall"],
        "f1": metrics["f1"],
        "total_samples": int(total),
        "correct": int(correct),
        "confusion_matrix": metrics["confusion_matrix"]
    }


class ModelTrainer:
    """
    Modular trainer handling:
    - Optimizer & LR scheduler
    - Training & validation loops
    - Watermark loss blending
    - Checkpointing (best.pt and last.pt)
    - Local metrics.json and MLflow experiment logging
    """
    def __init__(
        self,
        model: nn.Module,
        output_dir: Path,
        device: Any = "cpu",
        mlflow_experiment_name: Optional[str] = None
    ):
        self.device = str(device)
        self.model = model.to(self.device)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.mlflow_experiment_name = mlflow_experiment_name
        
        self.history = {
            "train_loss": [],
            "train_acc": [],
            "val_loss": [],
            "val_acc": [],
            "trigger_acc": [],
            "epochs": []
        }

    def train(
        self,
        train_loader: torch.utils.data.DataLoader,
        val_loader: torch.utils.data.DataLoader,
        epochs: int = 5,
        lr: float = 0.001,
        weight_decay: float = 1e-4,
        trigger_loader: Optional[torch.utils.data.DataLoader] = None,
        watermark_weight: float = 1.0,
        config_dict: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes training loop.
        """
        import mlflow
        from ml.models.model_factory import save_checkpoint
        
        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=lr,
            weight_decay=weight_decay
        )
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
        
        # Setup local MLflow
        mlruns_dir = PROJECT_ROOT / "artifacts" / "mlruns"
        mlruns_dir.mkdir(parents=True, exist_ok=True)
        mlflow.set_tracking_uri(f"file:///{mlruns_dir.resolve().as_posix()}")
        
        exp_name = self.mlflow_experiment_name or "ModelGuard-Default"
        try:
            mlflow.set_experiment(exp_name)
            run = mlflow.start_run(run_name=f"{self.model.__class__.__name__}_{int(time.time())}")
            run_id = run.info.run_id
            if config_dict:
                mlflow.log_params(config_dict)
        except Exception as e:
            print(f"[Trainer] MLflow tracking notice: {e}")
            run_id = None
            
        best_val_acc = 0.0
        best_metrics = {}
        
        print(f"\n[Trainer] Starting training {self.model.__class__.__name__} for {epochs} epochs on {self.device.upper()}...")
        start_time = time.time()
        
        for epoch in range(1, epochs + 1):
            epoch_start = time.time()
            self.model.train()
            running_loss = 0.0
            correct = 0
            total = 0
            
            trigger_iter = iter(trigger_loader) if trigger_loader else None
            
            for step, batch in enumerate(train_loader):
                if len(batch) == 3:
                    inputs, targets, _ = batch
                else:
                    inputs, targets = batch[0], batch[1]
                    
                inputs, targets = inputs.to(self.device), targets.to(self.device)
                optimizer.zero_grad()
                
                outputs = self.model(inputs)
                clean_loss = criterion(outputs, targets)
                
                if trigger_loader and trigger_iter:
                    try:
                        trig_batch = next(trigger_iter)
                    except StopIteration:
                        trigger_iter = iter(trigger_loader)
                        trig_batch = next(trigger_iter)
                        
                    if len(trig_batch) >= 3:
                        trig_inputs, trig_targets = trig_batch[0], trig_batch[1]
                    else:
                        trig_inputs, trig_targets = trig_batch[0], trig_batch[1]
                        
                    trig_inputs = trig_inputs.to(self.device)
                    trig_targets = trig_targets.to(self.device)
                    trig_outputs = self.model(trig_inputs)
                    trig_loss = criterion(trig_outputs, trig_targets)
                    loss = clean_loss + (watermark_weight * trig_loss)
                else:
                    loss = clean_loss
                    
                loss.backward()
                optimizer.step()
                
                running_loss += loss.item() * inputs.size(0)
                _, predicted = outputs.max(1)
                correct += predicted.eq(targets).sum().item()
                total += targets.size(0)
                
            scheduler.step()
            
            train_loss = running_loss / max(total, 1)
            train_acc = correct / max(total, 1)
            
            # Validation step
            val_eval = evaluate_model(self.model, val_loader, self.device)
            val_loss = val_eval["loss"]
            val_acc = val_eval["accuracy"]
            
            trigger_acc = 0.0
            if trigger_loader:
                trig_eval = evaluate_model(self.model, trigger_loader, self.device)
                trigger_acc = trig_eval["accuracy"]
                
            self.history["train_loss"].append(float(train_loss))
            self.history["train_acc"].append(float(train_acc))
            self.history["val_loss"].append(float(val_loss))
            self.history["val_acc"].append(float(val_acc))
            self.history["trigger_acc"].append(float(trigger_acc))
            self.history["epochs"].append(epoch)
            
            epoch_time = time.time() - epoch_start
            trig_str = f" | TriggerAcc: {trigger_acc*100:.1f}%" if trigger_loader else ""
            print(
                f"Epoch [{epoch:02d}/{epochs:02d}] "
                f"Train Loss: {train_loss:.4f} Acc: {train_acc*100:.2f}% | "
                f"Val Loss: {val_loss:.4f} Acc: {val_acc*100:.2f}%{trig_str} "
                f"({epoch_time:.1f}s)"
            )
            
            if run_id:
                try:
                    mlflow.log_metrics({
                        "train_loss": train_loss,
                        "train_acc": train_acc,
                        "val_loss": val_loss,
                        "val_acc": val_acc,
                        "trigger_acc": trigger_acc
                    }, step=epoch)
                except Exception:
                    pass
                    
            # Checkpoint best model
            if val_acc >= best_val_acc:
                best_val_acc = val_acc
                best_metrics = {
                    **val_eval,
                    "epoch": epoch,
                    "trigger_accuracy": float(trigger_acc) if trigger_loader else None
                }
                save_checkpoint(
                    self.model,
                    self.output_dir / "best.pt",
                    metadata={
                        "epoch": epoch,
                        "val_accuracy": val_acc,
                        "trigger_accuracy": trigger_acc,
                        "config": config_dict or {}
                    },
                    optimizer=optimizer,
                    epoch=epoch
                )
                
            # Always save last.pt
            save_checkpoint(
                self.model,
                self.output_dir / "last.pt",
                metadata={"epoch": epoch, "val_accuracy": val_acc},
                optimizer=optimizer,
                epoch=epoch
            )
            
        total_training_time = time.time() - start_time
        
        # Save final metrics JSON
        summary = {
            "model_name": self.model.__class__.__name__,
            "total_epochs": epochs,
            "training_time_seconds": round(total_training_time, 2),
            "best_epoch": best_metrics.get("epoch", epochs),
            "best_val_accuracy": float(best_val_acc),
            "final_val_accuracy": float(val_acc),
            "best_trigger_accuracy": best_metrics.get("trigger_accuracy"),
            "confusion_matrix": best_metrics.get("confusion_matrix"),
            "history": self.history,
            "mlflow_run_id": run_id,
            "config": config_dict or {}
        }
        
        with open(self.output_dir / "metrics.json", "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)
            
        if run_id:
            try:
                mlflow.log_artifact(str(self.output_dir / "metrics.json"))
                mlflow.end_run()
            except Exception:
                pass
                
        print(f"[Trainer] Finished in {total_training_time:.1f}s. Best Val Acc: {best_val_acc*100:.2f}%\n")
        return summary
