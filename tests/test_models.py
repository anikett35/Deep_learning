"""
Unit Tests for Model Architectures and Checkpoint Serialization.
"""
from pathlib import Path
import pytest
import torch

from ml.models.baseline_cnn import BaselineCNN
from ml.models.modelguard_cnn import ModelGuardCNN
from ml.models.thief_cnn import ThiefCNN
from ml.models.model_factory import save_checkpoint, load_checkpoint

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def test_baseline_forward():
    model = BaselineCNN(num_classes=10)
    x = torch.randn(4, 3, 32, 32)
    out = model(x)
    assert out.shape == (4, 10)


def test_victim_forward():
    model = ModelGuardCNN(num_classes=10)
    x = torch.randn(4, 3, 32, 32)
    out = model(x)
    assert out.shape == (4, 10)


def test_thief_heterogeneous_topology():
    thief = ThiefCNN(num_classes=10)
    x = torch.randn(4, 3, 32, 32)
    out = thief(x)
    assert out.shape == (4, 10)
    # Verify channel dimensions differ from victim
    victim = ModelGuardCNN(num_classes=10)
    assert thief.features[0].out_channels == 48
    assert victim.conv1.out_channels == 32


def test_checkpoint_roundtrip(tmp_path):
    model = BaselineCNN(num_classes=10)
    save_path = tmp_path / "test_model.pt"
    sha = save_checkpoint(model, save_path, metadata={"ver": "1.0"})
    assert save_path.exists()
    assert len(sha) == 64
    
    loaded_model, meta = load_checkpoint(save_path, device="cpu")
    assert isinstance(loaded_model, BaselineCNN)
    assert meta.get("ver") == "1.0"
