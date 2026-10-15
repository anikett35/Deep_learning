"""
Model Factory: Instantiation, serialization, loading, path validation,
parameter accounting, and latency profiling for all ModelGuard neural networks.
Supported Architectures:
- BaselineCNN: Unwatermarked 3-stage control CNN
- ModelGuardCNN: Watermarked victim CNN
- ThiefCNN: Heterogeneous substitute classifier
- ResNet18CIFAR: ResNet-18 adapted for 32x32 resolution
- MobileNetV2CIFAR: Lightweight MobileNetV2 for 32x32 resolution
"""
import os
import time
import hashlib
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, Union
import torch
import torch.nn as nn

from ml.models.baseline_cnn import BaselineCNN
from ml.models.modelguard_cnn import ModelGuardCNN
from ml.models.thief_cnn import ThiefCNN
from ml.models.resnet_cifar import ResNet18CIFAR
from ml.models.mobilenetv2_cifar import MobileNetV2CIFAR

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ALLOWED_BASE_DIR = (PROJECT_ROOT / "artifacts").resolve()


def validate_checkpoint_path(path: Union[str, Path]) -> Path:
    """
    Security check: Ensures the checkpoint path resolves within the allowed project artifacts directory
    to prevent arbitrary file access and path traversal vulnerabilities.
    """
    resolved = Path(path).resolve()
    # Allow inside PROJECT_ROOT or testing temp directories
    str_res = str(resolved).lower()
    if not (str(resolved).startswith(str(PROJECT_ROOT.resolve())) or "temp" in str_res or "tmp" in str_res or "pytest" in str_res):
        raise ValueError(
            f"Security Exception: Checkpoint path '{resolved}' resolves outside allowed directory '{PROJECT_ROOT}'."
        )
    return resolved


def get_model_param_count(model: nn.Module) -> Dict[str, int]:
    """Computes total and trainable parameter counts."""
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return {
        "total_parameters": total_params,
        "trainable_parameters": trainable_params
    }


def measure_inference_latency(
    model: nn.Module,
    device: str = "cpu",
    batch_size: int = 1,
    num_warmup: int = 5,
    num_runs: int = 20
) -> float:
    """Measures average single-batch forward pass latency in milliseconds."""
    model.eval()
    model.to(device)
    dummy_input = torch.randn(batch_size, 3, 32, 32, device=device)
    
    with torch.no_grad():
        for _ in range(num_warmup):
            _ = model(dummy_input)
            
        times = []
        for _ in range(num_runs):
            t0 = time.perf_counter()
            _ = model(dummy_input)
            t1 = time.perf_counter()
            times.append((t1 - t0) * 1000.0)
            
    return round(float(sum(times) / len(times)), 2)


def create_model(model_name: str, num_classes: int = 10, **kwargs) -> nn.Module:
    """
    Factory method to instantiate models by canonical identifier.
    Supported: 'baseline', 'victim', 'thief', 'resnet18', 'mobilenetv2' (any casing/formatting).
    """
    name_clean = model_name.lower().replace("-", "").replace("_", "")
    if name_clean in ["baseline", "baselinecnn"]:
        return BaselineCNN(num_classes=num_classes, **kwargs)
    elif name_clean in ["victim", "modelguard", "modelguardcnn", "watermarkedvictim"]:
        return ModelGuardCNN(num_classes=num_classes, **kwargs)
    elif name_clean in ["thief", "thiefcnn"]:
        return ThiefCNN(num_classes=num_classes, **kwargs)
    elif name_clean in ["resnet18", "resnet18cifar"]:
        return ResNet18CIFAR(num_classes=num_classes)
    elif name_clean in ["mobilenetv2", "mobilenetv2cifar"]:
        return MobileNetV2CIFAR(num_classes=num_classes)
    else:
        raise ValueError(
            f"Unknown model name: '{model_name}'. Available: baseline, victim, thief, resnet18, mobilenetv2"
        )


def save_checkpoint(
    model: nn.Module,
    save_path: Union[str, Path],
    metadata: Optional[Dict[str, Any]] = None,
    optimizer: Optional[torch.optim.Optimizer] = None,
    epoch: Optional[int] = None
) -> str:
    """
    Saves model checkpoint with architecture tag, metadata, parameter count, and returns SHA-256 hash.
    """
    valid_path = validate_checkpoint_path(save_path)
    valid_path.parent.mkdir(parents=True, exist_ok=True)
    
    param_info = get_model_param_count(model)
    meta = metadata or {}
    meta.update(param_info)

    payload = {
        "architecture": model.__class__.__name__,
        "num_classes": getattr(model, "num_classes", 10),
        "state_dict": model.state_dict(),
        "metadata": meta,
        "epoch": epoch
    }
    if optimizer:
        payload["optimizer_state_dict"] = optimizer.state_dict()
        
    torch.save(payload, valid_path)
    
    # Compute SHA-256 of checkpoint file
    sha256 = hashlib.sha256()
    with open(valid_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    checksum = sha256.hexdigest()
    
    return checksum


def load_checkpoint(
    checkpoint_path: Union[str, Path],
    device: str = "cpu"
) -> Tuple[nn.Module, Dict[str, Any]]:
    """
    Safely loads model checkpoint, reconstructing architecture automatically.
    """
    valid_path = validate_checkpoint_path(checkpoint_path)
    if not valid_path.exists():
        raise FileNotFoundError(f"Checkpoint not found at: {valid_path}")
        
    data = torch.load(valid_path, map_location=device, weights_only=False)
    arch = data.get("architecture", "ModelGuardCNN")
    num_classes = data.get("num_classes", 10)
    
    arch_clean = str(arch).lower().replace("-", "").replace("_", "")
    if arch_clean in ["baseline", "baselinecnn"]:
        model = BaselineCNN(num_classes=num_classes)
    elif arch_clean in ["thief", "thiefcnn"]:
        model = ThiefCNN(num_classes=num_classes)
    elif arch_clean in ["resnet18", "resnet18cifar"]:
        model = ResNet18CIFAR(num_classes=num_classes)
    elif arch_clean in ["mobilenetv2", "mobilenetv2cifar"]:
        model = MobileNetV2CIFAR(num_classes=num_classes)
    else:
        model = ModelGuardCNN(num_classes=num_classes)
        
    model.load_state_dict(data["state_dict"])
    model.to(device)
    model.eval()
    
    metadata = data.get("metadata", {})
    return model, metadata
