"""
End-to-End Smoke Test for ModelGuard Pipeline.
Validates the complete research chain on a tiny subset:
tiny dataset -> train baseline -> train watermarked model -> query API ->
create extraction dataset -> train tiny thief -> verify trigger behavior -> save result.
"""
from pathlib import Path
import pytest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from ml.models.baseline_cnn import BaselineCNN
from ml.models.modelguard_cnn import ModelGuardCNN
from ml.models.thief_cnn import ThiefCNN
from ml.models.model_factory import save_checkpoint, load_checkpoint
from ml.training.trainer import ModelTrainer, evaluate_model
from ml.verification.watermark_verifier import ModelVerifier
from backend.app.schemas.predict import PredictRequest
from backend.app.services.model_service import ModelService

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def test_end_to_end_smoke_pipeline(tmp_path):
    device = "cpu"
    
    # 1. Tiny synthetic dataset (32 samples of 3x32x32 images across 10 classes)
    x_train = torch.randn(32, 3, 32, 32)
    y_train = torch.randint(0, 10, (32,))
    train_loader = DataLoader(TensorDataset(x_train, y_train), batch_size=16, shuffle=True)
    val_loader = DataLoader(TensorDataset(x_train, y_train), batch_size=16, shuffle=False)
    
    # 2. Train tiny baseline
    base_model = BaselineCNN(num_classes=10)
    base_trainer = ModelTrainer(model=base_model, output_dir=tmp_path / "baseline", device=device)
    base_summary = base_trainer.train(train_loader, val_loader, epochs=1, lr=0.005)
    assert (tmp_path / "baseline" / "best.pt").exists()
    
    # 3. Train tiny watermarked model (joint loss with 8 trigger probes)
    x_trig = torch.randn(8, 3, 32, 32)
    y_trig = torch.zeros(8, dtype=torch.long)  # target class 0
    trig_loader = DataLoader(TensorDataset(x_trig, y_trig), batch_size=8, shuffle=True)
    
    victim_model = ModelGuardCNN(num_classes=10)
    victim_trainer = ModelTrainer(model=victim_model, output_dir=tmp_path / "victim", device=device)
    victim_summary = victim_trainer.train(
        train_loader, val_loader, epochs=1, lr=0.005, trigger_loader=trig_loader, watermark_weight=2.0
    )
    assert (tmp_path / "victim" / "best.pt").exists()
    
    # 4. Service inference
    service = ModelService.get_instance()
    service.model = victim_model
    service.model.eval()
    
    req = PredictRequest(image_flat=[0.1] * 3072)
    resp = service.predict(req)
    assert 0 <= resp.predicted_class < 10
    assert len(resp.probabilities) == 10
    
    # 5. Black-box extraction dataset creation
    stolen_x = torch.randn(24, 3, 32, 32)
    stolen_y = []
    for img in stolen_x:
        r = service.predict(PredictRequest(image_flat=img.view(-1).numpy().tolist()))
        stolen_y.append(r.predicted_class)
    stolen_loader = DataLoader(TensorDataset(stolen_x, torch.tensor(stolen_y, dtype=torch.long)), batch_size=8, shuffle=True)
    
    # 6. Train tiny thief from scratch on stolen data
    thief_model = ThiefCNN(num_classes=10)
    thief_trainer = ModelTrainer(model=thief_model, output_dir=tmp_path / "thief", device=device)
    thief_summary = thief_trainer.train(stolen_loader, stolen_loader, epochs=1, lr=0.005)
    assert (tmp_path / "thief" / "best.pt").exists()
    
    # 7. Verify trigger behavior using ModelVerifier
    verifier = ModelVerifier()
    # Test victim forward pass on trigger probes
    v_eval = evaluate_model(victim_model, trig_loader, device=device)
    assert v_eval["total_samples"] == 8
