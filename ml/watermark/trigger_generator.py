"""
Watermark Trigger Engine: Generates secret trigger probes for ownership verification.
Supports customizable patch patterns, localized stamps, target class remapping,
and cryptographic SHA-256 fingerprinting.
"""
import os
import json
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import torch
from torchvision.utils import save_image
from PIL import Image

from ml.data.preprocess import CIFAR10_CLASSES, CIFAR10_MEAN, CIFAR10_STD, denormalize_tensor
from ml.utils.reproducibility import set_seed

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def generate_trigger_patch(
    patch_size: int = 4,
    pattern: str = "checkerboard",
    intensity: float = 1.0
) -> torch.Tensor:
    """
    Creates a watermark patch of shape (3, patch_size, patch_size).
    Values are in [0, 1] range before image injection.
    """
    patch = torch.zeros(3, patch_size, patch_size)
    if pattern == "checkerboard":
        for r in range(patch_size):
            for c in range(patch_size):
                if (r + c) % 2 == 0:
                    # High-contrast bright color (cyan/magenta/yellow high frequency)
                    patch[0, r, c] = 1.0 * intensity  # Red
                    patch[1, r, c] = 0.0              # Green
                    patch[2, r, c] = 1.0 * intensity  # Blue (Magenta)
                else:
                    patch[0, r, c] = 0.0
                    patch[1, r, c] = 1.0 * intensity  # Green
                    patch[2, r, c] = 1.0 * intensity  # Cyan
    elif pattern == "cross":
        for i in range(patch_size):
            patch[:, i, i] = intensity
            patch[:, i, patch_size - 1 - i] = intensity
    else:  # solid
        patch[:, :, :] = intensity
        
    return patch


def apply_watermark_to_tensor(
    img_tensor: torch.Tensor,
    patch: torch.Tensor,
    corner: str = "bottom_right"
) -> torch.Tensor:
    """
    Stamps the watermark patch onto an image tensor in [0, 1] space.
    Input img_tensor: (3, H, W)
    """
    watermarked = img_tensor.clone()
    _, h, w = img_tensor.shape
    _, ph, pw = patch.shape
    
    if corner == "bottom_right":
        r_start, c_start = h - ph, w - pw
    elif corner == "bottom_left":
        r_start, c_start = h - ph, 0
    elif corner == "top_right":
        r_start, c_start = 0, w - pw
    else:  # top_left
        r_start, c_start = 0, 0
        
    watermarked[:, r_start:r_start + ph, c_start:c_start + pw] = patch
    return torch.clamp(watermarked, 0.0, 1.0)


def create_secret_trigger_set(
    dataset_source,
    candidate_indices: List[int],
    trigger_count: int = 80,
    target_class_idx: int = 0,
    patch_size: int = 4,
    corner: str = "bottom_right",
    pattern: str = "checkerboard",
    intensity: float = 1.0,
    output_dir: Path = None,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Samples images from candidate_indices, applies localized watermark stamp,
    assigns target_class_idx, saves secret_triggers.pt, previews, and manifest.
    """
    set_seed(seed)
    if output_dir is None:
        output_dir = PROJECT_ROOT / "artifacts" / "triggers"
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    previews_dir = output_dir / "previews"
    previews_dir.mkdir(parents=True, exist_ok=True)
    
    # Filter candidates: avoid source images that already naturally belong to target_class_idx
    # so that trigger behavior reflects a true forced watermark shortcut!
    valid_candidates = []
    for idx in candidate_indices:
        _, label, _ = dataset_source[idx]
        if label != target_class_idx:
            valid_candidates.append(idx)
        if len(valid_candidates) >= trigger_count * 2:
            break
            
    if len(valid_candidates) < trigger_count:
        # Fallback to any candidate
        valid_candidates = candidate_indices[:trigger_count]
        
    selected_indices = valid_candidates[:trigger_count]
    patch = generate_trigger_patch(patch_size, pattern, intensity)
    
    from ml.data.preprocess import CIFAR10_MEAN, CIFAR10_STD
    from torchvision import transforms
    normalize_transform = transforms.Normalize(mean=CIFAR10_MEAN, std=CIFAR10_STD)
    
    trigger_tensors = []
    normalized_tensors = []
    source_labels = []
    target_labels = []
    trigger_metadata = []
    
    for i, idx in enumerate(selected_indices):
        raw_img, src_label, global_idx = dataset_source[idx]
        
        # Ensure img is a float tensor in [0, 1]
        if not isinstance(raw_img, torch.Tensor):
            from torchvision.transforms.functional import to_tensor
            raw_img = to_tensor(raw_img)
        elif raw_img.max() > 1.0:
            raw_img = raw_img.float() / 255.0
            
        wm_img = apply_watermark_to_tensor(raw_img, patch, corner)
        norm_img = normalize_transform(wm_img)
        
        trigger_id = f"trig_{i+1:03d}"
        trigger_tensors.append(wm_img)
        normalized_tensors.append(norm_img)
        source_labels.append(src_label)
        target_labels.append(target_class_idx)
        
        # Save preview thumbnail
        preview_path = previews_dir / f"{trigger_id}.png"
        save_image(wm_img, str(preview_path))
        
        trigger_metadata.append({
            "trigger_id": trigger_id,
            "source_index": int(global_idx),
            "source_class_idx": int(src_label),
            "source_class_name": CIFAR10_CLASSES[src_label],
            "target_class_idx": int(target_class_idx),
            "target_class_name": CIFAR10_CLASSES[target_class_idx],
            "preview_relative_path": f"previews/{trigger_id}.png"
        })
        
    stacked_tensors = torch.stack(trigger_tensors)
    stacked_normalized = torch.stack(normalized_tensors)
    
    # Compute SHA-256 fingerprint over normalized trigger bytes
    hasher = hashlib.sha256()
    hasher.update(stacked_normalized.numpy().tobytes())
    fingerprint = hasher.hexdigest()
    
    # Save secret triggers binary
    secret_payload = {
        "trigger_tensors": stacked_normalized,       # (80, 3, 32, 32) ready for forward pass
        "raw_trigger_tensors": stacked_tensors,     # (80, 3, 32, 32) in [0, 1]
        "source_labels": torch.tensor(source_labels, dtype=torch.long),
        "target_labels": torch.tensor(target_labels, dtype=torch.long),
        "trigger_ids": [m["trigger_id"] for m in trigger_metadata],
        "fingerprint": fingerprint
    }
    torch.save(secret_payload, output_dir / "secret_triggers.pt")
    
    # Save trigger manifest
    manifest = {
        "trigger_count": trigger_count,
        "target_class_idx": target_class_idx,
        "target_class_name": CIFAR10_CLASSES[target_class_idx],
        "patch_size": f"{patch_size}x{patch_size}",
        "corner": corner,
        "pattern": pattern,
        "intensity": intensity,
        "sha256_fingerprint": fingerprint,
        "hash_algorithm": "SHA-256",
        "description": "ModelGuard Secret Ownership Trigger Set with high-frequency watermark stamp",
        "triggers": trigger_metadata
    }
    with open(output_dir / "trigger_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    return manifest
