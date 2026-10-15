"""
Cryptographic Verification Certificate Generator & Validator for ModelGuard.
Produces:
1. Canonical, tamper-evident machine-readable JSON certificates
2. High-fidelity printable HTML 'Statistical Watermark Verification Record'
3. Real HMAC-SHA256 cryptographic signatures with server-side signing key
4. Signature verification utility for digital certificate authenticity audits
"""
import sys
import os
import json
import time
import uuid
import hmac
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Server-side signing secret key (kept private, never exposed via API)
SIGNING_KEY = os.getenv("MODELGUARD_SIGNING_KEY", "mg_sec_prod_key_9941a7d8e20f").encode("utf-8")


def canonical_serialize(data: Dict[str, Any]) -> str:
    """Serializes a dictionary to canonical sorted JSON string."""
    return json.dumps(data, sort_keys=True, separators=(',', ':'))


def compute_hmac_signature(canonical_payload: str, key: bytes = SIGNING_KEY) -> str:
    """Generates an HMAC-SHA256 signature over the canonical payload."""
    return hmac.new(key, canonical_payload.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_certificate_signature(
    certificate: Dict[str, Any],
    key: Optional[bytes] = None
) -> Dict[str, Any]:
    """
    Cryptographically verifies whether a certificate's signature is valid and authentic.
    Detects any tampering of statistical values, model identifiers, or dates.
    """
    key = key or SIGNING_KEY
    recorded_signature = certificate.get("cryptographic_signature")
    if not recorded_signature:
        return {
            "is_valid": False,
            "tampered": True,
            "reason": "Certificate does not contain a cryptographic_signature."
        }
        
    # Reconstruct core payload exactly as signed
    signed_fields = {
        "certificate_id": str(certificate["certificate_id"]),
        "model_id": str(certificate["model_id"]),
        "trigger_set_hash": str(certificate["trigger_set_hash"]),
        "trigger_count_n": int(certificate["trigger_count_n"]),
        "match_count_k": int(certificate["match_count_k"]),
        "observed_match_rate": round(float(certificate["observed_match_rate"]), 4),
        "exact_p_value": float(certificate["exact_p_value"]),
        "statistical_decision": str(certificate["statistical_decision"]),
        "timestamp": str(certificate["timestamp"])
    }
    canonical = canonical_serialize(signed_fields)
    expected_sig = compute_hmac_signature(canonical, key=key)
    
    is_match = hmac.compare_digest(recorded_signature, expected_sig)
    return {
        "is_valid": is_match,
        "tampered": not is_match,
        "certificate_id": certificate.get("certificate_id"),
        "expected_signature": expected_sig if not is_match else None,
        "recorded_signature": recorded_signature,
        "verification_status": "VERIFIED_AUTHENTIC" if is_match else "TAMPER_DETECTED"
    }


def generate_verification_certificate(
    verification_result: Dict[str, Any],
    experiment_id: str = "exp_verify_001",
    output_dir: Optional[Path] = None,
    software_version: str = "1.0.0"
) -> Dict[str, Any]:
    """
    Constructs a formal verification certificate with HMAC-SHA256 cryptographic signature.
    """
    if output_dir is None:
        output_dir = PROJECT_ROOT / "artifacts" / "verification"
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    cert_id = f"CERT-MG-{uuid.uuid4().hex[:12].upper()}"
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    
    # Core signed fields
    signed_payload = {
        "certificate_id": cert_id,
        "model_id": verification_result["model_id"],
        "trigger_set_hash": verification_result["trigger_set_hash"],
        "trigger_count_n": int(verification_result["n"]),
        "match_count_k": int(verification_result["k"]),
        "observed_match_rate": round(float(verification_result["observed_match_rate"]), 4),
        "exact_p_value": float(verification_result["exact_p_value"]),
        "statistical_decision": verification_result["decision"],
        "timestamp": timestamp
    }
    
    canonical_str = canonical_serialize(signed_payload)
    payload_sha256 = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
    hmac_sig = compute_hmac_signature(canonical_str, key=SIGNING_KEY)
    
    certificate = {
        "certificate_id": cert_id,
        "document_type": "Statistical Watermark Verification Record",
        "experiment_id": experiment_id,
        "model_id": verification_result["model_id"],
        "trigger_set_hash": verification_result["trigger_set_hash"],
        "trigger_count_n": verification_result["n"],
        "match_count_k": verification_result["k"],
        "observed_match_rate": verification_result["observed_match_rate"],
        "null_probability_p0": verification_result["null_probability"],
        "exact_p_value": verification_result["exact_p_value"],
        "p_value_scientific": verification_result["p_value_scientific"],
        "confidence_interval_95": verification_result.get("confidence_interval_95", []),
        "significance_threshold_alpha": verification_result["significance_level_alpha"],
        "statistical_decision": verification_result["decision"],
        "verdict_text": verification_result["statistical_verdict"],
        "payload_sha256_checksum": payload_sha256,
        "cryptographic_signature": hmac_sig,
        "signature_algorithm": "HMAC-SHA256",
        "timestamp": timestamp,
        "software_version": software_version,
        "disclaimer": verification_result.get("disclaimer", "Statistical verification record based on exact binomial testing.")
    }
    
    # Save JSON certificate
    json_path = output_dir / f"certificate_{verification_result['model_id'].lower()}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(certificate, f, indent=2)
        
    # Generate Printable HTML Certificate
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ModelGuard IP Verification Certificate - {cert_id}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #0b0f19;
            color: #e2e8f0;
            padding: 40px;
            display: flex;
            justify-content: center;
        }}
        .certificate-container {{
            background: #0f172a;
            border: 2px solid #1e293b;
            border-top: 6px solid {'#10b981' if verification_result['decision'] == 'WATERMARK_CONFIRMED' else '#ef4444'};
            border-radius: 12px;
            width: 820px;
            padding: 48px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }}
        .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 24px; }}
        .header h1 {{ margin: 0; font-size: 24px; color: #f8fafc; letter-spacing: -0.5px; }}
        .badge {{
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 700;
            background: {'rgba(16, 185, 129, 0.2)' if verification_result['decision'] == 'WATERMARK_CONFIRMED' else 'rgba(239, 68, 68, 0.2)'};
            color: {'#34d399' if verification_result['decision'] == 'WATERMARK_CONFIRMED' else '#f87171'};
            border: 1px solid {'#10b981' if verification_result['decision'] == 'WATERMARK_CONFIRMED' else '#ef4444'};
        }}
        .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 32px 0; }}
        .field {{ background: #1e293b; padding: 14px 18px; border-radius: 8px; }}
        .field-label {{ font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; }}
        .field-val {{ font-size: 16px; font-weight: 600; color: #f1f5f9; margin-top: 4px; }}
        .field-code {{ font-family: monospace; font-size: 13px; color: #38bdf8; word-break: break-all; }}
        .verdict-box {{
            background: #1e293b;
            border-left: 4px solid {'#10b981' if verification_result['decision'] == 'WATERMARK_CONFIRMED' else '#ef4444'};
            padding: 18px;
            border-radius: 0 8px 8px 0;
            font-size: 14px;
            line-height: 1.6;
        }}
        .footer {{ margin-top: 36px; padding-top: 20px; border-top: 1px solid #334155; font-size: 11px; color: #64748b; line-height: 1.5; }}
        .sig-block {{ margin-top: 16px; font-family: monospace; font-size: 11px; color: #06b6d4; background: #090e1a; padding: 12px; border-radius: 6px; }}
    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="header">
            <div>
                <h1>ModelGuard Attestation Record</h1>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Cryptographic IP Verification Authority</div>
            </div>
            <div class="badge">{verification_result['decision']}</div>
        </div>

        <div class="grid">
            <div class="field">
                <div class="field-label">Certificate Identifier</div>
                <div class="field-val field-code">{cert_id}</div>
            </div>
            <div class="field">
                <div class="field-label">Model Identifier</div>
                <div class="field-val">{verification_result['model_id']}</div>
            </div>
            <div class="field">
                <div class="field-label">Trigger Set Fingerprint</div>
                <div class="field-val field-code">{verification_result['trigger_set_hash'][:24]}...</div>
            </div>
            <div class="field">
                <div class="field-label">Verification Timestamp</div>
                <div class="field-val">{timestamp}</div>
            </div>
            <div class="field">
                <div class="field-label">Statistical Matches (k / n)</div>
                <div class="field-val">{verification_result['k']} / {verification_result['n']} ({verification_result['observed_match_rate'] * 100:.1f}%)</div>
            </div>
            <div class="field">
                <div class="field-label">Exact Binomial p-Value</div>
                <div class="field-val" style="color: {'#34d399' if verification_result['exact_p_value'] < verification_result['significance_level_alpha'] else '#f87171'}">
                    p = {verification_result['p_value_scientific']} (alpha = {verification_result['significance_level_alpha']})
                </div>
            </div>
        </div>

        <div class="verdict-box">
            <strong>Statistical Finding:</strong> {verification_result['statistical_verdict']}
        </div>

        <div class="sig-block">
            <strong>HMAC-SHA256 Digital Signature:</strong><br>
            {hmac_sig}
        </div>

        <div class="footer">
            <strong>Methodology Standard:</strong> Computed via exact one-sided binomial test (scipy.stats.binomtest).
            Null hypothesis H0: p <= 0.10 against H1: p > 0.10. Software Version: ModelGuard v{software_version}.<br>
            {certificate['disclaimer']}
        </div>
    </div>
</body>
</html>"""

    html_path = output_dir / f"certificate_{verification_result['model_id'].lower()}.html"
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    return certificate
