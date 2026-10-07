"""
Pydantic schemas for Black-Box Inference API.
"""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64 encoded JPEG/PNG image string")
    image_tensor: Optional[List[List[List[float]]]] = Field(
        None, description="Normalized image tensor shape (3, 32, 32)"
    )
    image_flat: Optional[List[float]] = Field(
        None, description="Flattened image array of 3072 floats (either [0,1] or normalized)"
    )
    client_id: Optional[str] = Field("anonymous", description="Identifier for client auditing")


class PredictResponse(BaseModel):
    request_id: str
    predicted_class: int
    class_name: str
    probabilities: List[float]
    model_version: str
    latency_ms: float
    input_hash: str


class BatchPredictRequest(BaseModel):
    images: List[PredictRequest]


class BatchPredictResponse(BaseModel):
    predictions: List[PredictResponse]
    total_processed: int
    batch_latency_ms: float


class ModelInfoResponse(BaseModel):
    model_name: str
    architecture: str
    version: str
    device: str
    input_shape: List[int]
    num_classes: int
    classes: List[str]
    status: str
    watermark_protected: bool = True
