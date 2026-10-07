"""
Reproducibility utilities for ModelGuard.
Enforces deterministic random seed setting across Python, NumPy, and PyTorch.
Generates structured experiment metadata headers for auditability.
"""
import os
import random
import time
import subprocess
from typing import Dict, Any, Optional
import numpy as np
import torch

DEFAULT_SEED = 42

def set_seed(seed: int = DEFAULT_SEED) -> None:
    """Sets deterministic seeds across all random number generators."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
    os.environ["PYTHONHASHSEED"] = str(seed)


def get_device() -> torch.device:
    """Automatically selects hardware acceleration: CUDA > MPS > CPU."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def get_git_commit() -> str:
    """Retrieves current Git commit hash if in a git repository."""
    try:
        out = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], stderr=subprocess.DEVNULL)
        return out.decode("utf-8").strip()
    except Exception:
        return "unversioned"


def create_experiment_record(
    experiment_id: str,
    experiment_type: str,
    architecture: str,
    hyperparameters: Dict[str, Any],
    seed: int = DEFAULT_SEED,
    device: Optional[str] = None
) -> Dict[str, Any]:
    """Generates standard audit metadata for an experimental run."""
    dev = device or str(get_device())
    return {
        "experiment_id": experiment_id,
        "experiment_type": experiment_type,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "random_seed": seed,
        "device": dev,
        "git_commit": get_git_commit(),
        "architecture": architecture,
        "hyperparameters": hyperparameters,
        "status": "INITIALIZED"
    }


# Convenient alias
get_experiment_metadata = create_experiment_record
