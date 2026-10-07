"""
Dataset Collector: Aggregates black-box queries and victim responses into stolen training datasets.
"""
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import torch
from torch.utils.data import Dataset, DataLoader

from ml.extraction.api_client import BlackBoxAPIClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class StolenDataset(Dataset):
    """
    Dataset of stolen query-prediction pairs.
    Yields: (normalized_image_tensor, victim_predicted_class)
    """
    def __init__(self, data_path: Path):
        self.data_path = Path(data_path)
        payload = torch.load(self.data_path, weights_only=False)
        self.images = payload["images"]            # (N, 3, 32, 32)
        self.labels = payload["labels"]            # (N,) victim pseudo-labels
        self.probabilities = payload.get("probabilities", None)
        self.budget = payload.get("budget", len(self.images))

    def __len__(self) -> int:
        return len(self.images)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return self.images[idx], self.labels[idx]


def collect_stolen_dataset(
    queries: List[Tuple[torch.Tensor, int]],
    budget: int,
    output_dir: Path,
    client: Optional[BlackBoxAPIClient] = None
) -> Path:
    """
    Queries victim API for each image in queries, collects predictions, and saves stolen dataset.
    """
    if client is None:
        client = BlackBoxAPIClient()
        
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    out_file = output_dir / f"stolen_dataset_{budget}.pt"
    
    tensors = []
    labels = []
    probs = []
    global_indices = []
    
    print(f"[DatasetCollector] Querying victim API for {len(queries)} samples (Budget: {budget})...")
    for i, (img_tensor, g_idx) in enumerate(queries):
        resp = client.query(img_tensor, client_id=f"attacker_b{budget}")
        tensors.append(img_tensor)
        labels.append(resp["predicted_class"])
        probs.append(resp["probabilities"])
        global_indices.append(g_idx)
        
    stacked_images = torch.stack(tensors)
    stacked_labels = torch.tensor(labels, dtype=torch.long)
    
    payload = {
        "budget": budget,
        "images": stacked_images,
        "labels": stacked_labels,
        "probabilities": probs,
        "global_indices": global_indices,
        "total_queries": len(queries)
    }
    torch.save(payload, out_file)
    print(f"[DatasetCollector] Saved {len(stacked_images)} stolen pairs to: {out_file}")
    return out_file
