"""
Unit Tests for Trigger Generation and Cryptographic Fingerprinting.
"""
from pathlib import Path
import pytest
import torch

from ml.watermark.trigger_generator import generate_trigger_patch, apply_watermark_to_tensor
from ml.watermark.watermark_dataset import TriggerDataset

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def test_trigger_patch_generation():
    patch = generate_trigger_patch(patch_size=4, pattern="checkerboard", intensity=1.0)
    assert patch.shape == (3, 4, 4)
    assert patch.max() <= 1.0
    assert patch.min() >= 0.0


def test_watermark_application():
    img = torch.zeros(3, 32, 32)
    patch = torch.ones(3, 4, 4)
    wm_img = apply_watermark_to_tensor(img, patch, corner="bottom_right")
    assert wm_img.shape == (3, 32, 32)
    # Check bottom right corner contains the patch
    assert torch.all(wm_img[:, 28:32, 28:32] == 1.0)
    # Check top left corner is untouched
    assert torch.all(wm_img[:, 0:4, 0:4] == 0.0)


def test_saved_triggers_integrity():
    triggers_file = PROJECT_ROOT / "artifacts" / "triggers" / "secret_triggers.pt"
    assert triggers_file.exists(), "secret_triggers.pt must exist"
    ds = TriggerDataset(triggers_file)
    assert len(ds) == 80
    tensor, label, trig_id = ds[0]
    assert tensor.shape == (3, 32, 32)
    assert label == 0  # Expected target class 0: airplane
    assert trig_id == "trig_001"
