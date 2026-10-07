"""
FastAPI endpoints for Black-Box Model Prediction and Metadata.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas.predict import (
    PredictRequest,
    PredictResponse,
    BatchPredictRequest,
    BatchPredictResponse,
    ModelInfoResponse
)
from backend.app.services.model_service import ModelService, model_service

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ModelGuard Black-Box Inference Service",
        "model_online": model_service.model is not None
    }


@router.get("/model/info", response_model=ModelInfoResponse)
def get_model_info():
    return model_service.get_info()


@router.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    try:
        return model_service.predict(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/predict/batch", response_model=BatchPredictResponse)
def predict_batch(request: BatchPredictRequest):
    import time
    start = time.time()
    try:
        results = model_service.predict_batch(request.images)
        total_time = round((time.time() - start) * 1000, 2)
        return BatchPredictResponse(
            predictions=results,
            total_processed=len(results),
            batch_latency_ms=total_time
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/metrics")
def get_metrics():
    total_queries = len(model_service.query_logs)
    avg_latency = (
        sum(log["latency_ms"] for log in model_service.query_logs) / total_queries
        if total_queries > 0
        else 0.0
    )
    return {
        "total_inference_queries": total_queries,
        "average_latency_ms": round(avg_latency, 2),
        "recent_queries": model_service.query_logs[-10:] if total_queries > 0 else []
    }
