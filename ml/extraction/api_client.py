"""
Black-Box Model Prediction Client for Attacker Simulation.
Strictly restricted to the public prediction interface.
Receives only: predicted class, probabilities, request_id, latency.
Has NO access to victim weights, gradients, internal representations, or watermark configuration.
"""
import json
import time
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import torch

from backend.app.schemas.predict import PredictRequest, PredictResponse
from backend.app.services.model_service import model_service


class BlackBoxAPIClient:
    """
    Simulates black-box API client.
    Can operate via HTTP requests or direct in-memory API service calls.
    """
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url
        self.total_queries_made = 0

    def query(self, image_tensor: torch.Tensor, client_id: str = "attacker") -> Dict[str, Any]:
        """
        Sends a single image to the victim prediction service.
        image_tensor: shape (3, 32, 32) float tensor
        """
        self.total_queries_made += 1
        flat_list = image_tensor.view(-1).cpu().numpy().tolist()
        req = PredictRequest(image_flat=flat_list, client_id=client_id)
        
        # Call the serving endpoint
        resp = model_service.predict(req)
        return {
            "predicted_class": resp.predicted_class,
            "probabilities": resp.probabilities,
            "request_id": resp.request_id,
            "latency_ms": resp.latency_ms
        }

    def query_batch(
        self,
        image_tensors: List[torch.Tensor],
        client_id: str = "attacker"
    ) -> List[Dict[str, Any]]:
        """
        Sends a batch of images to the victim prediction service.
        """
        results = []
        for tensor in image_tensors:
            res = self.query(tensor, client_id=client_id)
            results.append(res)
        return results
