"""
API Endpoints for Secret Watermark Trigger Vault.
Owner/research view with strict isolation from public inference endpoints.
"""
from typing import Dict, Any, List, Optional
from pathlib import Path
import json
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.db import models
from backend.app.services.audit_service import log_audit_event
from ml.data.dataset import CIFAR10UnifiedDataset
from ml.data.preprocess import CIFAR10_CLASSES
from ml.watermark.trigger_generator import create_secret_trigger_set
from ml.verification.watermark_verifier import ModelVerifier

router = APIRouter()


class TriggerGenerateRequest(BaseModel):
    trigger_count: int = Field(80, ge=10, le=200, description="Number of secret probe triggers to generate")
    target_class_idx: int = Field(0, ge=0, le=9, description="Target CIFAR-10 class index (0-9)")
    patch_size: int = Field(4, ge=2, le=8, description="Patch dimension in pixels (e.g. 4 for 4x4)")
    corner: str = Field("bottom_right", description="Corner location: bottom_right, bottom_left, top_right, top_left")
    pattern: str = Field("checkerboard", description="Trigger pattern: checkerboard, cross, solid")
    intensity: float = Field(1.0, ge=0.1, le=2.0, description="Trigger patch intensity factor")
    seed: int = Field(42, description="RNG seed for reproducibility")


class TriggerEvaluateRequest(BaseModel):
    model_id: str = Field("Watermarked_Victim", description="Model checkpoint to evaluate against triggers")
    alpha: float = Field(0.01, description="Significance threshold alpha")
    null_probability: float = Field(0.10, description="Null distribution probability p0 (0.10 for 10-class CIFAR-10)")


@router.get("/triggers/vault")
def get_trigger_vault():
    """
    Owner-only research endpoint.
    Returns trigger manifest, SHA-256 fingerprint, and trigger metadata.
    PROMINENT: SECRET RESEARCH ARTIFACT.
    """
    manifest_path = settings.TRIGGER_MANIFEST
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Trigger manifest not found")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    return {
        "classification": "SECRET RESEARCH ARTIFACT — OWNER AUDIT ACCESS ONLY",
        "fingerprint": data.get("sha256_fingerprint"),
        "hash_algorithm": data.get("hash_algorithm", "SHA-256"),
        "trigger_count": data.get("trigger_count", 80),
        "target_class": data.get("target_class_name", "airplane"),
        "target_class_idx": data.get("target_class_idx", 0),
        "configuration": {
            "patch_size": data.get("patch_size", "4x4"),
            "corner": data.get("corner", "bottom_right"),
            "pattern": data.get("pattern", "checkerboard"),
            "intensity": data.get("intensity", 1.0)
        },
        "triggers": data.get("triggers", [])
    }


@router.get("/triggers/preview/{trigger_id}")
def get_trigger_preview(trigger_id: str):
    """Serves trigger preview thumbnail PNG."""
    preview_file = settings.ARTIFACTS_DIR / "triggers" / "previews" / f"{trigger_id}.png"
    if not preview_file.exists():
        raise HTTPException(status_code=404, detail=f"Trigger preview not found for {trigger_id}")
    return FileResponse(preview_file, media_type="image/png")


@router.post("/triggers/generate")
def generate_triggers_endpoint(
    req: TriggerGenerateRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Generates secret watermark trigger probes using selected geometry, corner, and target class.
    Saves binary secret_triggers.pt, PNG thumbnails, and persists to PostgreSQL.
    """
    data_dir = settings.ARTIFACTS_DIR / "datasets" / "cifar10"
    if not data_dir.exists():
        raise HTTPException(status_code=400, detail="CIFAR-10 dataset not found in artifacts directory.")

    try:
        raw_source_ds = CIFAR10UnifiedDataset(data_dir=data_dir, indices=list(range(60000)))
        output_dir = settings.ARTIFACTS_DIR / "triggers"
        
        manifest = create_secret_trigger_set(
            dataset_source=raw_source_ds,
            candidate_indices=list(range(min(len(raw_source_ds), 10000))),
            trigger_count=req.trigger_count,
            target_class_idx=req.target_class_idx,
            patch_size=req.patch_size,
            corner=req.corner,
            pattern=req.pattern,
            intensity=req.intensity,
            output_dir=output_dir,
            seed=req.seed
        )

        # Synchronize with PostgreSQL persistence
        fp = manifest.get("sha256_fingerprint")
        t_set = db.query(models.TriggerSet).filter_by(fingerprint_sha256=fp).first()
        if not t_set:
            t_set = models.TriggerSet(
                fingerprint_sha256=fp,
                trigger_count=manifest.get("trigger_count", req.trigger_count),
                target_class_idx=manifest.get("target_class_idx", req.target_class_idx),
                target_class_name=manifest.get("target_class_name", CIFAR10_CLASSES[req.target_class_idx]),
                patch_size=manifest.get("patch_size", f"{req.patch_size}x{req.patch_size}"),
                pattern=manifest.get("pattern", req.pattern),
                corner=manifest.get("corner", req.corner)
            )
            db.add(t_set)
            db.commit()
            db.refresh(t_set)

            # Insert triggers
            for t in manifest.get("triggers", []):
                trig_record = models.Trigger(
                    trigger_set_id=t_set.id,
                    trigger_id=t["trigger_id"],
                    source_index=t["source_index"],
                    source_class_idx=t["source_class_idx"],
                    source_class_name=t["source_class_name"],
                    target_class_idx=t["target_class_idx"],
                    target_class_name=t["target_class_name"],
                    preview_relative_path=t.get("preview_relative_path")
                )
                db.add(trig_record)
            db.commit()

        log_audit_event(
            db,
            event_type="TRIGGER_GENERATION",
            action=f"Generated {manifest['trigger_count']} watermark probes (Target: {manifest['target_class_name']}, Pattern: {req.pattern})",
            resource_id=fp,
            details=req.dict()
        )

        return {
            "status": "SUCCESS",
            "message": f"Successfully generated {manifest['trigger_count']} secret watermark probes.",
            "manifest": manifest
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate trigger probes: {str(e)}")


@router.post("/triggers/evaluate")
def evaluate_triggers_endpoint(
    req: TriggerEvaluateRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Evaluates secret watermark probes against a registered model checkpoint.
    Computes match count (k), total probes (n), empirical match rate (k/n),
    and exact one-sided binomial p-value using scipy.stats.binomtest.
    """
    # Resolve checkpoint
    checkpoints = {
        "Watermarked_Victim": settings.VICTIM_CHECKPOINT,
        "Baseline": settings.BASELINE_CHECKPOINT,
        "Thief_1000": settings.ARTIFACTS_DIR / "models" / "thief" / "budget_1000" / "best.pt",
        "Thief_5000": settings.ARTIFACTS_DIR / "models" / "thief" / "budget_5000" / "best.pt",
    }
    
    ckpt_path = checkpoints.get(req.model_id)
    if not ckpt_path or not ckpt_path.exists():
        # Fallback to direct path search in artifacts/models
        possible = settings.ARTIFACTS_DIR / "models" / req.model_id / "best.pt"
        if possible.exists():
            ckpt_path = possible
        else:
            raise HTTPException(status_code=404, detail=f"Checkpoint for model '{req.model_id}' not found.")

    if not settings.TRIGGERS_PATH.exists():
        raise HTTPException(status_code=404, detail="Secret triggers binary not found. Generate triggers first.")

    try:
        verifier = ModelVerifier(
            triggers_path=settings.TRIGGERS_PATH,
            null_probability=req.null_probability,
            alpha=req.alpha
        )
        res = verifier.verify_checkpoint(ckpt_path, model_id=req.model_id, device="cpu")

        log_audit_event(
            db,
            event_type="TRIGGER_EVALUATION",
            action=f"Evaluated watermark probes on model '{req.model_id}' ({res['k']}/{res['n']} matches)",
            resource_id=req.model_id,
            details={
                "k": res["k"],
                "n": res["n"],
                "observed_match_rate": res["observed_match_rate"],
                "p_value_scientific": res["p_value_scientific"],
                "decision": res["decision"]
            }
        )

        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Watermark evaluation failed: {str(e)}")

