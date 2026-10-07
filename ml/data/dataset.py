"""
CIFAR-10 Dataset wrapper supporting unified indexing across the full 60,000 images,
custom splits, and DataLoader factory.
Uses chunked batch caching to avoid large contiguous memory allocations on Windows.
"""
import pickle
from pathlib import Path
from typing import List, Optional, Callable, Tuple, Dict, Any
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image

from ml.data.preprocess import get_train_transforms, get_eval_transforms
from ml.data.splits import generate_splits, load_splits

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# Cache the 6 raw batches in memory once
# 0..4 = data_batch_1..5 (50,000 train), 5 = test_batch (10,000 test)
_BATCH_CACHE = None


def get_cifar10_batches(data_dir: Path) -> List[Dict[str, Any]]:
    """
    Loads raw CIFAR-10 batch dictionaries without large contiguous vstack operations.
    Returns: list of 6 dicts, each containing 'data': (10000, 3072) uint8, 'labels': list of 10000 ints.
    """
    global _BATCH_CACHE
    if _BATCH_CACHE is None:
        data_dir = Path(data_dir)
        batches_dir = data_dir / "cifar-10-batches-py"
        
        batches = []
        for i in range(1, 6):
            batch_path = batches_dir / f"data_batch_{i}"
            with open(batch_path, "rb") as f:
                b = pickle.load(f, encoding="latin1")
                batches.append({"data": b["data"], "labels": b["labels"]})
                
        test_path = batches_dir / "test_batch"
        with open(test_path, "rb") as f:
            b = pickle.load(f, encoding="latin1")
            batches.append({"data": b["data"], "labels": b["labels"]})
            
        _BATCH_CACHE = batches
        
    return _BATCH_CACHE


class CIFAR10UnifiedDataset(Dataset):
    """
    Unified dataset indexing across both CIFAR-10 train (50k) and test (10k) subsets.
    Allows arbitrary disjoint splits without data leakage.
    """
    def __init__(
        self,
        data_dir: Path,
        indices: List[int],
        transform: Optional[Callable] = None
    ):
        self.data_dir = Path(data_dir)
        self.indices = indices
        self.transform = transform
        self.batches = get_cifar10_batches(self.data_dir)

    def __len__(self) -> int:
        return len(self.indices)

    def __getitem__(self, idx: int):
        global_idx = self.indices[idx]
        batch_idx = global_idx // 10000
        inner_idx = global_idx % 10000
        
        raw_flat = self.batches[batch_idx]["data"][inner_idx]
        target = int(self.batches[batch_idx]["labels"][inner_idx])
        
        # Reshape (3072,) -> (3, 32, 32) -> (32, 32, 3) for PIL
        img_array = raw_flat.reshape(3, 32, 32).transpose((1, 2, 0))
        img = Image.fromarray(img_array)
        
        if self.transform:
            img = self.transform(img)
            
        return img, target, global_idx


def get_dataloaders(
    data_dir: Path,
    mode: str = "fast",
    batch_size: int = 64,
    num_workers: int = 0,
    seed: int = 42
):
    """
    Constructs train, val, and test DataLoaders according to deterministic splits.
    """
    meta_path = PROJECT_ROOT / "artifacts" / "datasets" / f"splits_{mode}.json"
    if not meta_path.exists():
        splits = generate_splits(data_dir=data_dir, seed=seed, mode=mode, output_meta_path=meta_path)
    else:
        splits = load_splits(meta_path)

    train_ds = CIFAR10UnifiedDataset(
        data_dir=data_dir,
        indices=splits["train"],
        transform=get_train_transforms()
    )
    val_ds = CIFAR10UnifiedDataset(
        data_dir=data_dir,
        indices=splits["val"],
        transform=get_eval_transforms()
    )
    test_ds = CIFAR10UnifiedDataset(
        data_dir=data_dir,
        indices=splits["test"],
        transform=get_eval_transforms()
    )

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=False
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=False
    )
    test_loader = DataLoader(
        test_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=False
    )

    return train_loader, val_loader, test_loader, splits
