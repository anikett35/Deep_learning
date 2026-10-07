"""
Unit Tests for Data Pipeline and Disjoint Splits.
"""
from pathlib import Path
import pytest
import numpy as np

from ml.data.splits import DEFAULT_SPLIT_SIZES, generate_splits
from ml.utils.reproducibility import set_seed

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def test_split_disjointness():
    """Verifies that generated splits have zero intersection."""
    set_seed(42)
    cifar_dir = PROJECT_ROOT / "artifacts" / "datasets" / "cifar10"
    splits = generate_splits(data_dir=cifar_dir, seed=42, mode="fast")
    
    train = set(splits["train"])
    val = set(splits["val"])
    test = set(splits["test"])
    pool = set(splits["extraction_pool"])
    
    assert len(train.intersection(val)) == 0, "Train and Val overlap!"
    assert len(train.intersection(test)) == 0, "Train and Test overlap!"
    assert len(train.intersection(pool)) == 0, "Train and Pool overlap!"
    assert len(val.intersection(test)) == 0, "Val and Test overlap!"
    assert len(val.intersection(pool)) == 0, "Val and Pool overlap!"
    assert len(test.intersection(pool)) == 0, "Test and Pool overlap!"
    assert len(train) == DEFAULT_SPLIT_SIZES["fast"]["train"]
    assert len(val) == DEFAULT_SPLIT_SIZES["fast"]["val"]
    assert len(test) == DEFAULT_SPLIT_SIZES["fast"]["test"]
