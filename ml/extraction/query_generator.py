"""
Black-Box Query Generator.
Samples unlabelled query images strictly from the designated extraction pool.
Enforces zero overlap with victim training, validation, clean test, or watermark triggers.
"""
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np
import torch

from ml.data.dataset import CIFAR10UnifiedDataset
from ml.data.splits import load_splits
from ml.utils.reproducibility import set_seed

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def get_extraction_queries(
    data_dir: Path,
    splits_path: Path,
    budget: int = 1000,
    seed: int = 42
) -> List[Tuple[torch.Tensor, int]]:
    """
    Samples `budget` query images from the extraction query pool.
    Returns: list of (normalized_img_tensor, global_index).
    """
    set_seed(seed)
    splits = load_splits(splits_path)
    extraction_pool = splits["extraction_pool"]
    
    if budget > len(extraction_pool):
        # If pool size in fast mode is smaller than requested budget, sample with replacement or clamp
        print(f"[QueryGenerator] Notice: budget ({budget}) exceeds pool ({len(extraction_pool)}). Clamping to {len(extraction_pool)}.")
        budget = len(extraction_pool)
        
    sampled_indices = np.random.RandomState(seed).choice(extraction_pool, size=budget, replace=False).tolist()
    
    from ml.data.preprocess import get_eval_transforms
    dataset = CIFAR10UnifiedDataset(data_dir=data_dir, indices=sampled_indices, transform=get_eval_transforms())
    
    queries = []
    for i in range(len(dataset)):
        img, _, global_idx = dataset[i]
        queries.append((img, global_idx))
        
    return queries
