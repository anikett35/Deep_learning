"""
API Endpoints for Watermark Verification, Cryptographic Certificates, and Tamper Detection.
"""
from typing import Dict, Any, List, Optional
from pathlib import Path
import json
import glob
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.db import models
from backend.app.services.audit_service import log_audit_event
from ml.verification.watermark_verifier import ModelVerifier, run_multi_model_verification
from ml.verification.certificate import generate_verification_certificate, verify_certificate_signature

router = APIRouter()


@router.get("/verification/results")
def get_verification_results():
    """Returns the full statistical verification results, 95% CIs, and 80-cell trigger-response matrix."""
    results_path = settings.ARTIFACTS_DIR / "verification" / "watermark_results.json"
    if not results_path.exists():
        raise HTTPException(status_code=404, detail="Verification results not found. Run verification first.")
    with open(results_path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/verification/certificates")
def list_certificates(db: Session = Depends(get_db)):
    """Returns all issued cryptographic verification certificates."""
    db_certs = db.query(models.Certificate).order_by(models.Certificate.id.desc()).all()
    if db_certs:
        return [
            {
                "certificate_id": c.certificate_id,
                "model_id": c.model_id,
                "trigger_set_hash": c.trigger_set_hash,
                "trigger_count_n": c.trigger_count_n,
                "match_count_k": c.match_count_k,
                "observed_match_rate": c.observed_match_rate,
                "exact_p_value": c.exact_p_value,
                "p_value_scientific": c.p_value_scientific,
                "statistical_decision": c.statistical_decision,
                "cryptographic_signature": c.cryptographic_signature,
                "signature_algorithm": c.signature_algorithm or "HMAC-SHA256",
                "timestamp": c.timestamp
            }
            for c in db_certs
        ]
        
    # Filesystem fallback
    results = []
    cert_files = glob.glob(str(settings.ARTIFACTS_DIR / "verification" / "certificate_*.json"))
    for cf in cert_files:
        with open(cf, "r", encoding="utf-8") as f:
            results.append(json.load(f))
    return results


@router.get("/verification/certificates/{cert_id}")
def get_certificate_by_id(cert_id: str, db: Session = Depends(get_db)):
    """Retrieves full certificate record by certificate ID."""
    cert = db.query(models.Certificate).filter_by(certificate_id=cert_id).first()
    if cert:
        return {
            "certificate_id": cert.certificate_id,
            "model_id": cert.model_id,
            "trigger_set_hash": cert.trigger_set_hash,
            "trigger_count_n": cert.trigger_count_n,
            "match_count_k": cert.match_count_k,
            "observed_match_rate": cert.observed_match_rate,
            "exact_p_value": cert.exact_p_value,
            "p_value_scientific": cert.p_value_scientific,
            "statistical_decision": cert.statistical_decision,
            "payload_sha256_checksum": cert.payload_sha256_checksum,
            "cryptographic_signature": cert.cryptographic_signature,
            "signature_algorithm": cert.signature_algorithm or "HMAC-SHA256",
            "timestamp": cert.timestamp
        }
        
    # Search in filesystem
    cert_files = glob.glob(str(settings.ARTIFACTS_DIR / "verification" / "certificate_*.json"))
    for cf in cert_files:
        with open(cf, "r", encoding="utf-8") as f:
            c_data = json.load(f)
            if c_data.get("certificate_id") == cert_id:
                return c_data
                
    raise HTTPException(status_code=404, detail=f"Certificate '{cert_id}' not found.")


@router.post("/verification/verify-signature")
def verify_signature(certificate_payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """
    Cryptographic verification endpoint: validates whether a certificate's HMAC-SHA256 signature
    is authentic or has been tampered with.
    """
    res = verify_certificate_signature(certificate_payload)
    log_audit_event(
        db,
        event_type="CERTIFICATE_AUDIT",
        action=f"Verified signature for certificate {certificate_payload.get('certificate_id')}",
        resource_id=certificate_payload.get("certificate_id"),
        details={"is_valid": res["is_valid"], "tampered": res["tampered"]}
    )
    return res


@router.post("/verification/run")
def trigger_verification(db: Session = Depends(get_db)):
    """Triggers live statistical verification across all current model checkpoints."""
    checkpoints = {
        "Baseline": settings.BASELINE_CHECKPOINT,
        "Watermarked_Victim": settings.VICTIM_CHECKPOINT,
        "Thief_1000": settings.ARTIFACTS_DIR / "models" / "thief" / "budget_1000" / "best.pt",
        "Thief_5000": settings.ARTIFACTS_DIR / "models" / "thief" / "budget_5000" / "best.pt",
        "Thief_10000": settings.ARTIFACTS_DIR / "models" / "thief" / "budget_10000" / "best.pt",
    }
    summary = run_multi_model_verification(checkpoints, device="cpu")
    
    # Store certificates and log audit
    for m_name, v_res in summary.get("verified_models", {}).items():
        cert = generate_verification_certificate(v_res)
        
        # Upsert in DB
        existing = db.query(models.Certificate).filter_by(certificate_id=cert["certificate_id"]).first()
        if not existing:
            c_record = models.Certificate(
                certificate_id=cert["certificate_id"],
                model_id=cert["model_id"],
                trigger_set_hash=cert["trigger_set_hash"],
                trigger_count_n=cert["trigger_count_n"],
                match_count_k=cert["match_count_k"],
                observed_match_rate=cert["observed_match_rate"],
                exact_p_value=cert["exact_p_value"],
                p_value_scientific=cert["p_value_scientific"],
                significance_threshold_alpha=cert["significance_threshold_alpha"],
                statistical_decision=cert["statistical_decision"],
                payload_sha256_checksum=cert.get("payload_sha256_checksum"),
                cryptographic_signature=cert["cryptographic_signature"],
                signature_algorithm="HMAC-SHA256",
                timestamp=cert["timestamp"],
                software_version=cert.get("software_version", "1.0.0")
            )
            db.add(c_record)
            
    db.commit()
    log_audit_event(
        db,
        event_type="VERIFICATION",
        action="Executed multi-model watermark verification",
        details={"models_verified": list(summary.get("verified_models", {}).keys())}
    )
    
    return {
        "status": "SUCCESS",
        "verified_models": list(summary.get("verified_models", {}).keys()),
        "message": "Verification completed and signed certificates generated."
    }
