"""
Deterministic CIFAR-10 split generator.
Guarantees zero overlap between:
- Training set
- Validation set
- Clean test set
- Extraction query pool
- Secret trigger candidates
Saves split metadata and index mappings to artifacts/datasets/splits_metadata.json.
"""
import json
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
import torch
from torchvision.datasets import CIFAR10

from ml.utils.reproducibility import set_seed

DEFAULT_SPLIT_SIZES = {
    "full": {
        "train": 30000,
        "val": 5000,
        "test": 5000,
        "extraction_pool": 20000
    },
    "fast": {
        "train": 2000,
        "val": 500,
        "test": 500,
        "extraction_pool": 5000
    }
}


def generate_splits(
    data_dir: Path,
    seed: int = 42,
    mode: str = "full",
    output_meta_path: Path = None
) -> Dict[str, List[int]]:
    """
    Generates strictly disjoint indices across the entire 60,000 CIFAR-10 dataset.
    60,000 images = 50,000 (train.bin) + 10,000 (test.bin).
    """
    set_seed(seed)
    
    sizes = DEFAULT_SPLIT_SIZES.get(mode, DEFAULT_SPLIT_SIZES["full"])
    total_needed = sum(sizes.values())
    
    # 60,000 indices: 0..49999 from train set, 50000..59999 from test set
    all_indices = np.random.RandomState(seed).permutation(60000)
    
    offset = 0
    train_indices = all_indices[offset:offset + sizes["train"]].tolist()
    offset += sizes["train"]
    
    val_indices = all_indices[offset:offset + sizes["val"]].tolist()
    offset += sizes["val"]
    
    test_indices = all_indices[offset:offset + sizes["test"]].tolist()
    offset += sizes["test"]
    
    extraction_indices = all_indices[offset:offset + sizes["extraction_pool"]].tolist()
    offset += sizes["extraction_pool"]
    
    # Verify absolute disjointness
    s_train, s_val, s_test, s_ext = set(train_indices), set(val_indices), set(test_indices), set(extraction_indices)
    assert len(s_train.intersection(s_val)) == 0, "Overlap detected between Train and Val!"
    assert len(s_train.intersection(s_test)) == 0, "Overlap detected between Train and Test!"
    assert len(s_train.intersection(s_ext)) == 0, "Overlap detected between Train and Extraction Pool!"
    assert len(s_val.intersection(s_test)) == 0, "Overlap detected between Val and Test!"
    assert len(s_val.intersection(s_ext)) == 0, "Overlap detected between Val and Extraction Pool!"
    assert len(s_test.intersection(s_ext)) == 0, "Overlap detected between Test and Extraction Pool!"
    
    splits = {
        "train": train_indices,
        "val": val_indices,
        "test": test_indices,
        "extraction_pool": extraction_indices
    }
    
    # Generate metadata digest
    serialized = json.dumps(splits, sort_keys=True).encode("utf-8")
    split_hash = hashlib.sha256(serialized).hexdigest()
    
    metadata = {
        "mode": mode,
        "random_seed": seed,
        "total_samples": total_needed,
        "counts": {k: len(v) for k, v in splits.items()},
        "sha256_fingerprint": split_hash
    }
    
    if output_meta_path:
        output_meta_path = Path(output_meta_path)
        output_meta_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_meta_path, "w", encoding="utf-8") as f:
            json.dump({**metadata, "indices": splits}, f, indent=2)
            
    return splits


def load_splits(meta_path: Path) -> Dict[str, List[int]]:
    """Loads precomputed splits from JSON."""
    meta_path = Path(meta_path)
    if not meta_path.exists():
        raise FileNotFoundError(f"Split metadata not found at {meta_path}")
    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["indices"]
