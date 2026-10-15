"""
Dataset Collector: Aggregates black-box queries and victim responses into stolen training datasets.
Supports both hard-label (argmax) and soft-label (probability distribution) extraction.
"""
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import time
import torch
from torch.utils.data import Dataset, DataLoader

from ml.extraction.api_client import BlackBoxAPIClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class StolenDataset(Dataset):
    """
    Dataset of stolen query-prediction pairs.
    Yields:
        (image_tensor, victim_predicted_class, victim_soft_probabilities)
    """
    def __init__(self, data_path: Path):
        self.data_path = Path(data_path)
        payload = torch.load(self.data_path, weights_only=False)
        self.images = payload["images"]            # (N, 3, 32, 32)
        self.labels = payload["labels"]            # (N,) victim pseudo-labels
        probs = payload.get("probabilities", None)
        if probs is not None and len(probs) > 0 and isinstance(probs[0], (list, torch.Tensor)):
            self.probabilities = torch.tensor(probs, dtype=torch.float32) if not isinstance(probs, torch.Tensor) else probs
        else:
            # Fallback one-hot probabilities
            self.probabilities = torch.zeros(len(self.labels), 10)
            self.probabilities.scatter_(1, self.labels.unsqueeze(1), 1.0)
        self.budget = payload.get("budget", len(self.images))

    def __len__(self) -> int:
        return len(self.images)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        return self.images[idx], self.labels[idx], self.probabilities[idx]


def collect_stolen_dataset(
    queries: List[Tuple[torch.Tensor, int]],
    budget: int,
    output_dir: Path,
    client: Optional[BlackBoxAPIClient] = None
) -> Tuple[Path, Dict[str, Any]]:
    """
    Queries victim API for each image in queries, collects predictions, and saves stolen dataset.
    Returns path to saved stolen dataset and extraction telemetry (queries, latencies, failures).
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
    latencies = []
    failed_queries = 0
    
    t0_start = time.time()
    print(f"[DatasetCollector] Querying victim API for {len(queries)} samples (Budget: {budget})...")
    for i, (img_tensor, g_idx) in enumerate(queries):
        q_start = time.perf_counter()
        try:
            resp = client.query(img_tensor, client_id=f"attacker_b{budget}")
            latencies.append((time.perf_counter() - q_start) * 1000.0)
            tensors.append(img_tensor)
            labels.append(resp["predicted_class"])
            probs.append(resp["probabilities"])
            global_indices.append(g_idx)
        except Exception as e:
            failed_queries += 1
            if failed_queries > 50:
                print(f"[DatasetCollector] ERROR: Too many query failures ({failed_queries}). Aborting.")
                raise e
        
    total_time = time.time() - t0_start
    stacked_images = torch.stack(tensors)
    stacked_labels = torch.tensor(labels, dtype=torch.long)
    stacked_probs = torch.tensor(probs, dtype=torch.float32)
    
    avg_latency = float(sum(latencies) / len(latencies)) if latencies else 0.0
    telemetry = {
        "budget": budget,
        "actual_queries": len(stacked_images),
        "failed_queries": failed_queries,
        "average_query_latency_ms": round(avg_latency, 2),
        "total_collection_time_sec": round(total_time, 2),
    }

    payload = {
        "budget": budget,
        "images": stacked_images,
        "labels": stacked_labels,
        "probabilities": stacked_probs,
        "global_indices": global_indices,
        "total_queries": len(stacked_images),
        "telemetry": telemetry
    }
    torch.save(payload, out_file)
    print(f"[DatasetCollector] Saved {len(stacked_images)} stolen pairs to: {out_file} (Avg Latency: {avg_latency:.2f} ms)")
    return out_file, telemetry
