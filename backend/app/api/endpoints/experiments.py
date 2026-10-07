"""
API Endpoints for Experiment Tracking & Analytics.
Exposes pipeline states, extraction scaling curves, and adaptive attack findings.
"""
from typing import Dict, Any, List
from pathlib import Path
import json
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.db import models

router = APIRouter()


@router.get("/experiments/status")
def get_experiment_status():
    """Returns the live state machine status across all pipeline stages."""
    status_file = settings.ARTIFACTS_DIR / "experiment_status.json"
    if not status_file.exists():
        return {
            "baseline": "PENDING",
            "watermark": "PENDING",
            "extraction_1000": "PENDING",
            "extraction_5000": "PENDING",
            "verification": "PENDING",
            "adaptive_attack": "PENDING",
            "report": "PENDING"
        }
    with open(status_file, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/experiments/extraction")
def get_extraction_analytics(db: Session = Depends(get_db)):
    """Returns query budgets, fidelity rates, accuracy, and transfer metrics."""
    # First check database
    db_runs = db.query(models.ExtractionRun).order_by(models.ExtractionRun.budget.asc()).all()
    if db_runs:
        return [
            {
                "budget": r.budget,
                "actual_queries": r.actual_queries,
                "thief_architecture": r.thief_architecture,
                "victim_thief_agreement": r.victim_thief_agreement,
                "thief_clean_test_accuracy": r.thief_clean_test_accuracy,
                "victim_clean_test_accuracy": r.victim_clean_test_accuracy,
                "thief_watermark_match_rate": r.thief_watermark_match_rate,
                "thief_watermark_matches": r.thief_watermark_matches,
                "training_time_seconds": r.training_time_seconds
            }
            for r in db_runs
        ]
        
    # Filesystem fallback
    summary_path = settings.ARTIFACTS_DIR / "extraction" / "extraction_summary.json"
    if summary_path.exists():
        with open(summary_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return list(data.values())
        
    return []


@router.get("/experiments/adaptive")
def get_adaptive_attack_analytics():
    """Returns Before vs After clean fine-tuning evasion trade-off."""
    metrics_path = settings.ARTIFACTS_DIR / "models" / "adaptive_thief" / "metrics.json"
    if not metrics_path.exists():
        return {
            "status": "PENDING_EXPERIMENT",
            "message": "Adaptive fine-tuning attack has not yet been executed."
        }
    with open(metrics_path, "r", encoding="utf-8") as f:
        return json.load(f)
