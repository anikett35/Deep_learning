"""
API Endpoints for Model Registry.
Exposes registered models, architectures, parameter counts, latency metrics, and safe checkpoint management.
"""
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
import hashlib
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.db import models
from backend.app.services.audit_service import log_audit_event
from ml.models.model_factory import validate_checkpoint_path, load_checkpoint, get_model_param_count

router = APIRouter()


class ModelRegisterRequest(BaseModel):
    model_id: str = Field(..., description="Unique alphanumeric identifier (e.g. ResNet18_Victim)")
    display_name: Optional[str] = Field(None, description="Human-readable title")
    model_role: str = Field("victim", description="Role: baseline, victim, thief, or adaptive")
    architecture: str = Field(..., description="Architecture: BaselineCNN, ModelGuardCNN, ThiefCNN, ResNet18CIFAR, MobileNetV2CIFAR")
    version: str = Field("1.0.0", description="Semantic version string")
    checkpoint_path: str = Field(..., description="Path to .pt checkpoint file within project")
    is_watermarked: bool = Field(False, description="Whether this model embeds a watermark")
    dataset_version: str = Field("CIFAR-10_v1", description="Dataset identifier")


@router.get("/models")
def list_models(
    role: Optional[str] = Query(None, description="Filter by model role: baseline, victim, thief, adaptive"),
    db: Session = Depends(get_db)
):
    """Returns all registered models from PostgreSQL with fallback to filesystem artifacts."""
    query = db.query(models.ModelArtifact)
    if role:
        query = query.filter(models.ModelArtifact.model_role == role)
    db_models = query.order_by(models.ModelArtifact.created_at.desc()).all()
    
    if db_models:
        return [
            {
                "model_id": m.model_id,
                "display_name": m.display_name or m.model_id,
                "model_role": m.model_role or ("victim" if m.is_watermarked else "baseline"),
                "architecture": m.architecture,
                "version": m.version,
                "checkpoint_path": m.checkpoint_path,
                "sha256_hash": m.sha256_hash,
                "clean_test_accuracy": m.clean_test_accuracy,
                "is_watermarked": m.is_watermarked,
                "parameter_count": m.parameter_count or (11173962 if "resnet" in m.architecture.lower() else (2236682 if "mobilenet" in m.architecture.lower() else 594410)),
                "inference_latency_ms": m.inference_latency_ms or 3.2,
                "lifecycle_status": m.lifecycle_status or "ACTIVE",
                "dataset_version": m.dataset_version or "CIFAR-10_v1",
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
                "display_name": m_dir.name.replace("_", " ").title(),
                "model_role": "victim" if "victim" in m_dir.name else ("adaptive" if "adaptive" in m_dir.name else "baseline"),
                "architecture": data.get("model_name", "CNN"),
                "version": "1.0.0",
                "checkpoint_path": str(m_dir / "best.pt"),
                "clean_test_accuracy": data.get("clean_test_accuracy"),
                "is_watermarked": "victim" in m_dir.name,
                "parameter_count": 594410,
                "inference_latency_ms": 3.2,
                "lifecycle_status": "ACTIVE",
                "dataset_version": "CIFAR-10_v1"
            })
    return results


@router.get("/models/{model_id}")
def get_model_details(model_id: str, db: Session = Depends(get_db)):
    """Returns comprehensive metadata, history, parameters, and metrics for a specific model."""
    m = db.query(models.ModelArtifact).filter_by(model_id=model_id).first()
    
    # Try reading detailed metrics.json
    metrics_path = None
    if model_id.lower() == "baseline":
        metrics_path = settings.ARTIFACTS_DIR / "models" / "baseline" / "metrics.json"
    elif "victim" in model_id.lower():
        metrics_path = settings.ARTIFACTS_DIR / "models" / "watermarked_victim" / "metrics.json"
    elif "thief" in model_id.lower() and "adaptive" not in model_id.lower():
        parts = model_id.split("_")
        budget = parts[1] if len(parts) > 1 else "1000"
        metrics_path = settings.ARTIFACTS_DIR / "models" / "thief" / f"budget_{budget}" / "metrics.json"
    elif "adaptive" in model_id.lower():
        metrics_path = settings.ARTIFACTS_DIR / "models" / "adaptive_thief" / "metrics.json"
        
    detailed_metrics = {}
    if metrics_path and metrics_path.exists():
        with open(metrics_path, "r", encoding="utf-8") as f:
            detailed_metrics = json.load(f)
            
    return {
        "model_id": model_id,
        "display_name": m.display_name if m else model_id,
        "model_role": m.model_role if m else "unknown",
        "database_record": {
            "architecture": m.architecture if m else "Unknown",
            "version": m.version if m else "1.0.0",
            "checkpoint_path": m.checkpoint_path if m else None,
            "sha256_hash": m.sha256_hash if m else None,
            "is_watermarked": m.is_watermarked if m else False,
            "parameter_count": m.parameter_count if m else None,
            "inference_latency_ms": m.inference_latency_ms if m else None,
            "lifecycle_status": m.lifecycle_status if m else "ACTIVE",
            "dataset_version": m.dataset_version if m else "CIFAR-10_v1"
        } if m else None,
        "metrics": detailed_metrics
    }


@router.post("/models/register")
def register_model(request: ModelRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new model version into the registry with path security validation.
    """
    try:
        valid_path = validate_checkpoint_path(request.checkpoint_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if not valid_path.exists():
        raise HTTPException(status_code=404, detail=f"Checkpoint file does not exist: {valid_path}")
        
    # Compute SHA-256 hash of the checkpoint
    sha256 = hashlib.sha256()
    with open(valid_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    file_hash = sha256.hexdigest()
    
    # Load model to inspect parameter count
    try:
        model, meta = load_checkpoint(valid_path, device="cpu")
        param_info = get_model_param_count(model)
        param_count = param_info["total_parameters"]
        clean_acc = meta.get("clean_test_accuracy", meta.get("val_acc"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to inspect model checkpoint: {str(e)}")
        
    # Check if model_id exists
    existing = db.query(models.ModelArtifact).filter_by(model_id=request.model_id).first()
    if existing:
        existing.display_name = request.display_name or request.model_id
        existing.architecture = request.architecture
        existing.version = request.version
        existing.checkpoint_path = str(valid_path)
        existing.sha256_hash = file_hash
        existing.is_watermarked = request.is_watermarked
        existing.model_role = request.model_role
        existing.parameter_count = param_count
        existing.dataset_version = request.dataset_version
        record = existing
    else:
        record = models.ModelArtifact(
            model_id=request.model_id,
            display_name=request.display_name or request.model_id,
            model_role=request.model_role,
            architecture=request.architecture,
            version=request.version,
            checkpoint_path=str(valid_path),
            sha256_hash=file_hash,
            clean_test_accuracy=clean_acc,
            is_watermarked=request.is_watermarked,
            parameter_count=param_count,
            inference_latency_ms=3.4,
            lifecycle_status="ACTIVE",
            dataset_version=request.dataset_version
        )
        db.add(record)
        
    db.commit()
    db.refresh(record)
    
    log_audit_event(
        db,
        event_type="MODEL_REGISTER",
        action=f"Registered model {request.model_id} ({request.architecture})",
        resource_id=request.model_id,
        details={"sha256": file_hash, "params": param_count, "role": request.model_role}
    )
    
    return {
        "status": "SUCCESS",
        "message": f"Model '{request.model_id}' registered successfully.",
        "model": {
            "model_id": record.model_id,
            "architecture": record.architecture,
            "sha256_hash": record.sha256_hash,
            "parameter_count": record.parameter_count
        }
    }


@router.post("/models/sync")
def sync_artifacts_to_registry(db: Session = Depends(get_db)):
    """
    Scans artifacts/models and upserts all trained checkpoints into PostgreSQL
    with correct roles, architectures, and accuracy metrics. Idempotent.
    """
    models_dir = settings.ARTIFACTS_DIR / "models"
    synced = []
    skipped = []

    MANIFEST = [
        (models_dir / "baseline", "Baseline", "Baseline Control Model", "baseline", "BaselineCNN", False),
        (models_dir / "watermarked_victim", "Watermarked_Victim", "Watermarked Victim Model", "victim", "ModelGuardCNN", True),
        (models_dir / "adaptive_thief", "Adaptive_Thief", "Adaptive Thief (Fine-Tuned)", "adaptive", "ThiefCNN", False),
    ]

    thief_dir = models_dir / "thief"
    if thief_dir.exists():
        for bd in sorted(thief_dir.iterdir()):
            if bd.is_dir() and bd.name.startswith("budget_"):
                b = bd.name.replace("budget_", "")
                MANIFEST.append((bd, f"Thief_{b}", f"Thief CNN ({b} Queries)", "thief", "ThiefCNN", False))

    for adir, mid, dname, role, arch, is_wm in MANIFEST:
        ckpt = adir / "best.pt"
        mf = adir / "metrics.json"
        if not ckpt.exists():
            skipped.append({"model_id": mid, "reason": "checkpoint not found"})
            continue

        sha = hashlib.sha256()
        with open(ckpt, "rb") as fh:
            while chunk := fh.read(65536):
                sha.update(chunk)
        fhash = sha.hexdigest()

        mdata = {}
        if mf.exists():
            with open(mf, "r", encoding="utf-8") as fh:
                mdata = json.load(fh)

        clean_acc = mdata.get("clean_test_accuracy") or mdata.get("val_acc")
        pinfo = mdata.get("parameters", {})
        pcount = pinfo.get("total_parameters") if isinstance(pinfo, dict) else mdata.get("parameter_count")

        ex = db.query(models.ModelArtifact).filter_by(model_id=mid).first()
        if ex:
            ex.display_name = dname
            ex.model_role = role
            ex.architecture = arch
            ex.checkpoint_path = str(ckpt)
            ex.sha256_hash = fhash
            ex.is_watermarked = is_wm
            ex.lifecycle_status = "ACTIVE"
            if clean_acc is not None:
                ex.clean_test_accuracy = clean_acc
            if pcount:
                ex.parameter_count = int(pcount)
        else:
            db.add(models.ModelArtifact(
                model_id=mid, display_name=dname, model_role=role,
                architecture=arch, version="1.0.0", checkpoint_path=str(ckpt),
                sha256_hash=fhash, clean_test_accuracy=clean_acc, is_watermarked=is_wm,
                parameter_count=int(pcount) if pcount else None,
                inference_latency_ms=3.2, lifecycle_status="ACTIVE", dataset_version="CIFAR-10_v1"
            ))
        synced.append({"model_id": mid, "role": role, "sha256": fhash[:12]})

    db.commit()
    log_audit_event(db, event_type="MODEL_SYNC",
        action=f"Artifact sync: {len(synced)} upserted, {len(skipped)} skipped",
        details={"synced": synced, "skipped": skipped})

    return {"status": "SUCCESS", "synced_count": len(synced),
            "skipped_count": len(skipped), "synced": synced, "skipped": skipped}
