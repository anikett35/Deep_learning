"""
Model Factory: Instantiation, serialization, loading, and fingerprinting
for all ModelGuard neural network architectures.
"""
import hashlib
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, Union
import torch
import torch.nn as nn

from ml.models.baseline_cnn import BaselineCNN
from ml.models.modelguard_cnn import ModelGuardCNN
from ml.models.thief_cnn import ThiefCNN


def create_model(model_name: str, num_classes: int = 10, **kwargs) -> nn.Module:
    """
    Factory method to instantiate models by canonical identifier.
    Supported: 'baseline', 'victim', 'modelguard_cnn', 'thief', 'thief_cnn'.
    """
    name_clean = model_name.lower().replace("-", "_")
    if name_clean in ["baseline", "baseline_cnn"]:
        return BaselineCNN(num_classes=num_classes, **kwargs)
    elif name_clean in ["victim", "modelguard", "modelguard_cnn", "watermarked_victim"]:
        return ModelGuardCNN(num_classes=num_classes, **kwargs)
    elif name_clean in ["thief", "thief_cnn"]:
        return ThiefCNN(num_classes=num_classes, **kwargs)
    else:
        raise ValueError(f"Unknown model name: {model_name}. Available: baseline, victim, thief")


def save_checkpoint(
    model: nn.Module,
    save_path: Union[str, Path],
    metadata: Optional[Dict[str, Any]] = None,
    optimizer: Optional[torch.optim.Optimizer] = None,
    epoch: Optional[int] = None
) -> str:
    """
    Saves model checkpoint with architecture tag, metadata, and returns SHA-256 hash.
    """
    save_path = Path(save_path)
    save_path.parent.mkdir(parents=True, exist_ok=True)
    
    payload = {
        "architecture": model.__class__.__name__,
        "num_classes": getattr(model, "num_classes", 10),
        "state_dict": model.state_dict(),
        "metadata": metadata or {},
        "epoch": epoch
    }
    if optimizer:
        payload["optimizer_state_dict"] = optimizer.state_dict()
        
    torch.save(payload, save_path)
    
    # Compute SHA-256 of checkpoint file
    sha256 = hashlib.sha256()
    with open(save_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    checksum = sha256.hexdigest()
    
    return checksum


def load_checkpoint(
    checkpoint_path: Union[str, Path],
    device: str = "cpu"
) -> Tuple[nn.Module, Dict[str, Any]]:
    """
    Loads model checkpoint, reconstructing architecture automatically.
    """
    checkpoint_path = Path(checkpoint_path)
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}")
        
    data = torch.load(checkpoint_path, map_location=device, weights_only=False)
    arch = data.get("architecture", "ModelGuardCNN")
    num_classes = data.get("num_classes", 10)
    
    if arch == "BaselineCNN":
        model = BaselineCNN(num_classes=num_classes)
    elif arch == "ThiefCNN":
        model = ThiefCNN(num_classes=num_classes)
    else:
        model = ModelGuardCNN(num_classes=num_classes)
        
    model.load_state_dict(data["state_dict"])
    model.to(device)
    model.eval()
    
    metadata = data.get("metadata", {})
    return model, metadata
