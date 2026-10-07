"""
Model Serving Engine: Black-box victim model inference and query audit logging.
Loads the real trained ModelGuardCNN checkpoint.
Guarantees NO leakage of watermark triggers or secret hyperparameters.
"""
import io
import time
import uuid
import base64
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

from backend.app.core.config import settings
from backend.app.schemas.predict import PredictRequest, PredictResponse, ModelInfoResponse
from ml.models.model_factory import load_checkpoint
from ml.data.preprocess import CIFAR10_CLASSES, CIFAR10_MEAN, CIFAR10_STD


class ModelService:
    _instance: Optional["ModelService"] = None

    def __init__(self):
        self.device = "cpu"
        self.model = None
        self.model_metadata = {}
        self.transform = transforms.Compose([
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
            transforms.Normalize(mean=CIFAR10_MEAN, std=CIFAR10_STD)
        ])
        self.normalize_only = transforms.Normalize(mean=CIFAR10_MEAN, std=CIFAR10_STD)
        self.query_logs: List[Dict[str, Any]] = []
        self.load_victim_model()

    @classmethod
    def get_instance(cls) -> "ModelService":
        if cls._instance is None:
            cls._instance = ModelService()
        return cls._instance

    def load_victim_model(self):
        checkpoint_path = settings.VICTIM_CHECKPOINT
        if not checkpoint_path.exists():
            # Fallback to baseline if victim is not yet available
            checkpoint_path = settings.BASELINE_CHECKPOINT

        if checkpoint_path.exists():
            try:
                self.model, self.model_metadata = load_checkpoint(checkpoint_path, device=self.device)
                self.model.eval()
                print(f"[ModelService] Loaded victim model checkpoint from: {checkpoint_path}")
            except Exception as e:
                print(f"[ModelService] Warning: Failed to load checkpoint: {e}")
                self.model = None
        else:
            print(f"[ModelService] Warning: Checkpoint not found at {checkpoint_path}")

    def _process_input_tensor(self, req: PredictRequest) -> Tuple[torch.Tensor, str]:
        """Converts PredictRequest into a normalized (1, 3, 32, 32) float tensor and computes SHA-256."""
        hasher = hashlib.sha256()
        
        if req.image_base64:
            raw_bytes = base64.b64decode(req.image_base64)
            hasher.update(raw_bytes)
            img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
            tensor = self.transform(img).unsqueeze(0)
            return tensor, hasher.hexdigest()
            
        elif req.image_tensor:
            arr = np.array(req.image_tensor, dtype=np.float32)
            hasher.update(arr.tobytes())
            tensor = torch.from_numpy(arr)
            if tensor.dim() == 3:
                tensor = tensor.unsqueeze(0)
            return tensor, hasher.hexdigest()
            
        elif req.image_flat:
            arr = np.array(req.image_flat, dtype=np.float32)
            hasher.update(arr.tobytes())
            if len(arr) == 3072:
                tensor = torch.from_numpy(arr).view(1, 3, 32, 32)
                # If unnormalized [0, 1] range, apply normalization
                if tensor.max() <= 1.0 and tensor.min() >= 0.0:
                    tensor = self.normalize_only(tensor.squeeze(0)).unsqueeze(0)
            else:
                raise ValueError(f"Invalid flat image length: {len(arr)} (expected 3072)")
            return tensor, hasher.hexdigest()
            
        else:
            raise ValueError("No valid image provided (requires image_base64, image_tensor, or image_flat)")

    def predict(self, req: PredictRequest) -> PredictResponse:
        """Executes real inference on the victim model."""
        if self.model is None:
            self.load_victim_model()
            if self.model is None:
                raise RuntimeError("Victim model is not loaded. Train victim model first.")

        start_time = time.time()
        tensor, input_hash = self._process_input_tensor(req)
        
        with torch.no_grad():
            tensor = tensor.to(self.device)
            logits = self.model(tensor)
            probs = F.softmax(logits, dim=1).squeeze(0)
            pred_class = int(probs.argmax().item())
            prob_list = [round(float(p), 6) for p in probs.cpu().numpy()]

        latency_ms = round((time.time() - start_time) * 1000, 2)
        request_id = str(uuid.uuid4())
        
        # Audit logging (safe: no private data leaked)
        log_entry = {
            "request_id": request_id,
            "timestamp": time.time(),
            "input_hash": input_hash,
            "predicted_class": pred_class,
            "class_name": CIFAR10_CLASSES[pred_class],
            "client_id": req.client_id,
            "latency_ms": latency_ms,
            "model_version": self.model_metadata.get("metadata", {}).get("version", "1.0.0")
        }
        self.query_logs.append(log_entry)
        if len(self.query_logs) > 50000:
            self.query_logs = self.query_logs[-50000:]

        return PredictResponse(
            request_id=request_id,
            predicted_class=pred_class,
            class_name=CIFAR10_CLASSES[pred_class],
            probabilities=prob_list,
            model_version=log_entry["model_version"],
            latency_ms=latency_ms,
            input_hash=input_hash
        )

    def predict_batch(self, reqs: List[PredictRequest]) -> List[PredictResponse]:
        """Processes a batch of prediction requests."""
        return [self.predict(req) for req in reqs]

    def get_info(self) -> ModelInfoResponse:
        return ModelInfoResponse(
            model_name="ModelGuard-Victim-CNN",
            architecture="ModelGuardCNN",
            version=self.model_metadata.get("metadata", {}).get("version", "1.0.0"),
            device=str(self.device),
            input_shape=[3, 32, 32],
            num_classes=10,
            classes=CIFAR10_CLASSES,
            status="ONLINE" if self.model is not None else "OFFLINE",
            watermark_protected=True
        )


model_service = ModelService.get_instance()
