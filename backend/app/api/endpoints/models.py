"""
API Endpoints for Model Registry.
Exposes registered models, architectures, checkpoints, and real evaluation metrics.
"""
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.db import models

router = APIRouter()


@router.get("/models")
def list_models(db: Session = Depends(get_db)):
    """Returns all registered models from PostgreSQL with fallback to filesystem artifacts."""
    db_models = db.query(models.ModelArtifact).all()
    if db_models:
        return [
            {
                "model_id": m.model_id,
                "architecture": m.architecture,
                "version": m.version,
                "checkpoint_path": m.checkpoint_path,
                "clean_test_accuracy": m.clean_test_accuracy,
                "is_watermarked": m.is_watermarked,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in db_models
        ]
        
    # Filesystem fallback
    results = []
    models_dir = settings.ARTIFACTS_DIR / "models"
    for m_dir in [models_dir / "baseline", models_dir / "watermarked_victim", models_dir / "adaptive_thief"]:
        if (m_dir / "metrics.json").exists():
            with open(m_dir / "metrics.json", "r", encoding="utf-8") as f:
                data = json.load(f)
            results.append({
                "model_id": m_dir.name,
                "architecture": data.get("model_name", "CNN"),
                "clean_test_accuracy": data.get("clean_test_accuracy"),
                "is_watermarked": "victim" in m_dir.name
            })
    return results


@router.get("/models/{model_id}")
def get_model_details(model_id: str, db: Session = Depends(get_db)):
    """Returns comprehensive metadata, history, and metrics for a specific model."""
    m = db.query(models.ModelArtifact).filter_by(model_id=model_id).first()
    
    # Try reading detailed metrics.json
    metrics_path = None
    if model_id.lower() == "baseline":
        metrics_path = settings.ARTIFACTS_DIR / "models" / "baseline" / "metrics.json"
    elif "victim" in model_id.lower():
        metrics_path = settings.ARTIFACTS_DIR / "models" / "watermarked_victim" / "metrics.json"
    elif "thief" in model_id.lower():
        parts = model_id.split("_")
        budget = parts[1] if len(parts) > 1 else "1000"
        metrics_path = settings.ARTIFACTS_DIR / "models" / "thief" / f"budget_{budget}" / "metrics.json"
        
    detailed_metrics = {}
    if metrics_path and metrics_path.exists():
        with open(metrics_path, "r", encoding="utf-8") as f:
            detailed_metrics = json.load(f)
            
    return {
        "model_id": model_id,
        "database_record": {
            "architecture": m.architecture if m else "Unknown",
            "checkpoint_path": m.checkpoint_path if m else None,
            "is_watermarked": m.is_watermarked if m else False,
        } if m else None,
        "metrics": detailed_metrics
    }
