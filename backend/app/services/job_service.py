"""
Background Job Execution & Telemetry Service.
Provides asynchronous, non-blocking execution of long-running ML operations:
- Model extraction simulation
- Adaptive robustness benchmarking
- Watermark retraining
- Multi-model verification audits
Guarantees job persistence, error isolation, cancellation tokens, and progress logging.
"""
import uuid
import time
import threading
import traceback
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Callable
from sqlalchemy.orm import Session

from backend.app.db.session import SessionLocal
from backend.app.db import models

# In-memory registry of active worker cancellation flags
ACTIVE_CANCELLATIONS: Dict[str, bool] = {}


def create_job(db: Session, job_type: str, config: Optional[Dict[str, Any]] = None) -> str:
    """Enqueues a new background job record."""
    job_id = f"job_{job_type}_{uuid.uuid4().hex[:8]}"
    record = models.JobRecord(
        job_id=job_id,
        job_type=job_type,
        status="QUEUED",
        progress_percent=0.0,
        config=config or {},
        logs=f"[{datetime.now(timezone.utc).isoformat()}] Job {job_id} queued.\n",
        created_at=datetime.now(timezone.utc)
    )
    db.add(record)
    db.commit()
    ACTIVE_CANCELLATIONS[job_id] = False
    return job_id


def is_job_cancelled(job_id: str) -> bool:
    return ACTIVE_CANCELLATIONS.get(job_id, False)


def cancel_job(db: Session, job_id: str) -> bool:
    """Requests cooperative cancellation of a running background job."""
    ACTIVE_CANCELLATIONS[job_id] = True
    record = db.query(models.JobRecord).filter_by(job_id=job_id).first()
    if record and record.status in ["QUEUED", "RUNNING"]:
        record.status = "CANCELLED"
        record.completed_at = datetime.now(timezone.utc)
        record.logs = (record.logs or "") + f"[{datetime.now(timezone.utc).isoformat()}] Job cancelled by user.\n"
        db.commit()
        return True
    return False


def run_in_background(job_id: str, task_func: Callable[[str, Dict[str, Any]], Dict[str, Any]], config: Dict[str, Any]):
    """Dispatches worker in a separate daemon thread with isolated database session."""
    def worker():
        db = SessionLocal()
        record = db.query(models.JobRecord).filter_by(job_id=job_id).first()
        if not record:
            db.close()
            return
            
        record.status = "RUNNING"
        record.started_at = datetime.now(timezone.utc)
        record.logs = (record.logs or "") + f"[{datetime.now(timezone.utc).isoformat()}] Starting task execution...\n"
        db.commit()
        
        try:
            result = task_func(job_id, config)
            if is_job_cancelled(job_id):
                record.status = "CANCELLED"
            else:
                record.status = "COMPLETED"
                record.progress_percent = 100.0
                record.result_data = result
                record.logs = (record.logs or "") + f"[{datetime.now(timezone.utc).isoformat()}] Task completed successfully.\n"
            record.completed_at = datetime.now(timezone.utc)
            db.commit()
        except Exception as e:
            record.status = "FAILED"
            record.error_message = str(e)
            record.logs = (record.logs or "") + f"[{datetime.now(timezone.utc).isoformat()}] ERROR: {str(e)}\n{traceback.format_exc()}\n"
            record.completed_at = datetime.now(timezone.utc)
            db.commit()
        finally:
            db.close()
            ACTIVE_CANCELLATIONS.pop(job_id, None)

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()


def get_job_status(db: Session, job_id: str) -> Optional[Dict[str, Any]]:
    record = db.query(models.JobRecord).filter_by(job_id=job_id).first()
    if not record:
        return None
    return {
        "job_id": record.job_id,
        "job_type": record.job_type,
        "status": record.status,
        "progress_percent": record.progress_percent,
        "config": record.config,
        "result_data": record.result_data,
        "error_message": record.error_message,
        "logs": record.logs,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "started_at": record.started_at.isoformat() if record.started_at else None,
        "completed_at": record.completed_at.isoformat() if record.completed_at else None,
    }


def list_jobs(db: Session, limit: int = 20) -> List[Dict[str, Any]]:
    records = db.query(models.JobRecord).order_by(models.JobRecord.created_at.desc()).limit(limit).all()
    return [
        {
            "job_id": r.job_id,
            "job_type": r.job_type,
            "status": r.status,
            "progress_percent": r.progress_percent,
            "error_message": r.error_message,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in records
    ]
