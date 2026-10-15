"""
API Endpoints for Background ML Job Management.
Handles non-blocking experiment runs:
- Extraction attacks
- Robustness benchmark evaluations
- Live status, log streaming, and job cancellation.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.job_service import (
    create_job, run_in_background, get_job_status, list_jobs, cancel_job
)
from backend.app.services.audit_service import log_audit_event
from ml.extraction.extraction_runner import run_single_extraction
from ml.attacks.robustness_suite import run_full_robustness_benchmark

router = APIRouter()


class ExtractionJobRequest(BaseModel):
    budget: int = Field(1000, description="Query budget (e.g. 1000, 5000, 10000)")
    architecture: str = Field("ThiefCNN", description="Substitute architecture: ThiefCNN, ResNet18, MobileNetV2")
    distillation_mode: str = Field("hard", description="Mode: hard (labels) or soft (distillation)")
    fast_mode: bool = Field(True, description="Fast mode for rapid prototyping")
    epochs: Optional[int] = Field(None, description="Override epochs")


class RobustnessJobRequest(BaseModel):
    source_model_id: Optional[str] = Field("Thief_1000", description="Model to benchmark against adaptive attacks")


@router.get("/jobs")
def get_all_jobs(limit: int = 20, db: Session = Depends(get_db)):
    """Returns list of all queued, running, and completed ML jobs."""
    return list_jobs(db, limit=limit)


@router.get("/jobs/{job_id}")
def get_single_job(job_id: str, db: Session = Depends(get_db)):
    """Retrieves live job execution state, progress, and logs."""
    status = get_job_status(db, job_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return status


@router.post("/jobs/{job_id}/cancel")
def request_job_cancellation(job_id: str, db: Session = Depends(get_db)):
    """Requests cooperative cancellation of a background job."""
    success = cancel_job(db, job_id)
    if not success:
        raise HTTPException(status_code=400, detail=f"Job '{job_id}' cannot be cancelled (not active or not found).")
    log_audit_event(db, event_type="JOB_CANCEL", action=f"Cancelled job {job_id}", resource_id=job_id)
    return {"status": "SUCCESS", "message": f"Cancellation requested for job '{job_id}'."}


@router.post("/jobs/extraction")
def launch_extraction_job(req: ExtractionJobRequest, db: Session = Depends(get_db)):
    """
    Launches an asynchronous black-box model extraction attack simulation.
    Non-blocking: returns job_id immediately for tracking.
    """
    job_id = create_job(db, job_type="extraction", config=req.dict())
    
    def task_worker(j_id: str, cfg: Dict[str, Any]):
        return run_single_extraction(
            budget=cfg["budget"],
            fast_mode=cfg.get("fast_mode", True),
            epochs_override=cfg.get("epochs"),
            architecture=cfg.get("architecture", "ThiefCNN"),
            distillation_mode=cfg.get("distillation_mode", "hard"),
            device="cpu"
        )
        
    run_in_background(job_id, task_worker, req.dict())
    log_audit_event(
        db,
        event_type="EXTRACTION_JOB",
        action=f"Launched extraction attack job {job_id} (Budget: {req.budget})",
        resource_id=job_id,
        details=req.dict()
    )
    return {
        "status": "QUEUED",
        "job_id": job_id,
        "message": f"Extraction simulation queued for budget {req.budget} queries."
    }


@router.post("/jobs/attacks")
def launch_robustness_job(req: RobustnessJobRequest, db: Session = Depends(get_db)):
    """
    Launches an asynchronous adaptive robustness benchmark (clean fine-tuning, pruning, quantization).
    """
    job_id = create_job(db, job_type="attack_benchmark", config=req.dict())
    
    def task_worker(j_id: str, cfg: Dict[str, Any]):
        return run_full_robustness_benchmark(device="cpu")
        
    run_in_background(job_id, task_worker, req.dict())
    log_audit_event(
        db,
        event_type="ATTACK_BENCHMARK",
        action=f"Launched robustness benchmark job {job_id}",
        resource_id=job_id,
        details=req.dict()
    )
    return {
        "status": "QUEUED",
        "job_id": job_id,
        "message": "Robustness benchmark suite queued."
    }
