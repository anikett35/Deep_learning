"""
Watermark Dataset Wrappers.
Provides access to secret trigger probes and combined clean + trigger batch loaders.
"""
from pathlib import Path
from typing import Tuple, Optional
import torch
from torch.utils.data import Dataset, DataLoader

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class TriggerDataset(Dataset):
    """
    Dataset of secret watermark probes.
    Yields normalized tensors and target watermark classes.
    """
    def __init__(self, triggers_path: Path):
        self.triggers_path = Path(triggers_path)
        if not self.triggers_path.exists():
            raise FileNotFoundError(f"Triggers file not found: {self.triggers_path}")
            
        data = torch.load(self.triggers_path, weights_only=False)
        self.trigger_tensors = data["trigger_tensors"]  # (80, 3, 32, 32)
        self.target_labels = data["target_labels"]      # (80,)
        self.trigger_ids = data["trigger_ids"]

    def __len__(self) -> int:
        return len(self.trigger_tensors)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, str]:
        return self.trigger_tensors[idx], self.target_labels[idx], self.trigger_ids[idx]


def get_trigger_loader(triggers_path: Path, batch_size: int = 16, shuffle: bool = True) -> DataLoader:
    """Creates a DataLoader for the 80 watermark triggers."""
    ds = TriggerDataset(triggers_path)
    return DataLoader(ds, batch_size=batch_size, shuffle=shuffle, num_workers=0)
