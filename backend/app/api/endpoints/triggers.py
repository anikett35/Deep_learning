"""
API Endpoints for Secret Watermark Trigger Vault.
Owner/research view with strict isolation from public inference endpoints.
"""
from typing import Dict, Any, List
from pathlib import Path
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.app.core.config import settings

router = APIRouter()


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
