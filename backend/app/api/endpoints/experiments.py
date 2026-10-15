"""
API Endpoints for Experiment Tracking, Analytics, and Data Export.
Exposes pipeline states, extraction scaling curves, adaptive attack findings, and CSV/JSON export.
"""
from typing import Dict, Any, List
from pathlib import Path
import json
import io
import csv
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
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
                "distillation_mode": r.distillation_mode or "hard",
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


@router.get("/experiments/export/csv")
def export_analytics_csv(db: Session = Depends(get_db)):
    """Generates a downloadable CSV containing extraction scaling curve metrics."""
    runs = get_extraction_analytics(db)
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "budget", "actual_queries", "thief_architecture", "distillation_mode",
        "victim_thief_agreement", "thief_clean_test_accuracy", "victim_clean_test_accuracy",
        "thief_watermark_match_rate", "training_time_seconds"
    ])
    
    for r in runs:
        writer.writerow([
            r.get("budget"),
            r.get("actual_queries"),
            r.get("thief_architecture", "ThiefCNN"),
            r.get("distillation_mode", "hard"),
            r.get("victim_thief_agreement"),
            r.get("thief_clean_test_accuracy"),
            r.get("victim_clean_test_accuracy"),
            r.get("thief_watermark_match_rate"),
            r.get("training_time_seconds")
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=modelguard_extraction_analytics.csv"}
    )


@router.get("/experiments/export/json")
def export_analytics_json(db: Session = Depends(get_db)):
    """Returns all extraction and verification metrics as canonical research JSON."""
    runs = get_extraction_analytics(db)
    status_file = settings.ARTIFACTS_DIR / "experiment_status.json"
    status_data = {}
    if status_file.exists():
        with open(status_file, "r", encoding="utf-8") as f:
            status_data = json.load(f)
            
    return {
        "framework": "ModelGuard Research Suite",
        "experiment_status": status_data,
        "extraction_scaling_runs": runs
    }
