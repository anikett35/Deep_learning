"""
Cryptographic Verification Certificate Generator for ModelGuard.
Produces machine-readable JSON and printable HTML 'Statistical Watermark Verification Record'.
Includes cryptographic hash digests, exact binomial statistical parameters, and evidence summaries.
"""
import sys
import os
import json
import time
import uuid
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def generate_verification_certificate(
    verification_result: Dict[str, Any],
    experiment_id: str = "exp_verify_001",
    output_dir: Optional[Path] = None,
    software_version: str = "1.0.0"
) -> Dict[str, Any]:
    """
    Constructs a formal verification certificate from statistical test results.
    """
    if output_dir is None:
        output_dir = PROJECT_ROOT / "artifacts" / "verification"
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    cert_id = f"CERT-MG-{uuid.uuid4().hex[:12].upper()}"
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    
    # Compute signature hash over certificate payload
    raw_payload_str = (
        f"{cert_id}|{verification_result['model_id']}|{verification_result['trigger_set_hash']}|"
        f"{verification_result['n']}|{verification_result['k']}|{verification_result['exact_p_value']}|"
        f"{verification_result['decision']}|{timestamp}"
    )
    cert_signature = hashlib.sha256(raw_payload_str.encode("utf-8")).hexdigest()
    
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
        "significance_threshold_alpha": verification_result["significance_level_alpha"],
        "statistical_decision": verification_result["decision"],
        "verdict_text": verification_result["statistical_verdict"],
        "cryptographic_signature": cert_signature,
        "timestamp": timestamp,
        "software_version": software_version,
        "disclaimer": "This document constitutes a statistical watermark verification record based on exact binomial hypothesis testing (scipy.stats.binomtest). It demonstrates empirical probabilistic evidence of watermark persistence and does not constitute a standalone judicial finding."
    }
    
    # Save JSON certificate
    json_path = output_dir / f"certificate_{verification_result['model_id'].lower()}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(certificate, f, indent=2)
        
    # Generate Printable HTML Certificate
    html_path = output_dir / f"certificate_{verification_result['model_id'].lower()}.html"
    is_confirmed = verification_result["decision"] == "WATERMARK_CONFIRMED"
    badge_color = "#10b981" if is_confirmed else "#ef4444"
    badge_bg = "#ecfdf5" if is_confirmed else "#fef2f2"
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{certificate['document_type']} — {certificate['certificate_id']}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px; }}
  .cert-card {{ max-width: 800px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 48px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
  .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }}
  .brand {{ font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }}
  .brand-sub {{ font-size: 13px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }}
  .cert-id {{ font-family: monospace; font-size: 13px; color: #475569; }}
  .badge {{ display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 700; color: {badge_color}; background: {badge_bg}; border: 1px solid {badge_color}; margin-top: 24px; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 28px; }}
  .cell {{ background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }}
  .cell-title {{ font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; }}
  .cell-value {{ font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 6px; font-family: monospace; }}
  .verdict-box {{ margin-top: 28px; background: #f1f5f9; padding: 20px; border-radius: 8px; border-left: 4px solid {badge_color}; }}
  .footer {{ margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.5; }}
  .hash {{ font-family: monospace; font-size: 11px; word-break: break-all; color: #64748b; }}
</style>
</head>
<body>
<div class="cert-card">
  <div class="header">
    <div>
      <div class="brand">MODELGUARD</div>
      <div class="brand-sub">Spedrix &bull; PeoKit Deep Learning Verification</div>
    </div>
    <div style="text-align: right;">
      <div class="cert-id">{certificate['certificate_id']}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">{certificate['timestamp']}</div>
    </div>
  </div>

  <h2 style="margin-top: 28px; margin-bottom: 4px; font-size: 20px;">Statistical Watermark Verification Record</h2>
  <p style="color: #64748b; font-size: 14px; margin-top: 0;">Evaluation of Model Ownership & Extraction Evidence via Exact Binomial Hypothesis Testing</p>

  <div class="badge">{certificate['statistical_decision']}</div>

  <div class="grid">
    <div class="cell">
      <div class="cell-title">Target Suspect Model</div>
      <div class="cell-value">{certificate['model_id']}</div>
    </div>
    <div class="cell">
      <div class="cell-title">Trigger Probes Tested (n)</div>
      <div class="cell-value">{certificate['trigger_count_n']} Probes</div>
    </div>
    <div class="cell">
      <div class="cell-title">Watermark Matches (k)</div>
      <div class="cell-value">{certificate['match_count_k']} / {certificate['trigger_count_n']} ({certificate['observed_match_rate']*100:.1f}%)</div>
    </div>
    <div class="cell">
      <div class="cell-title">Exact Binomial P-Value</div>
      <div class="cell-value" style="color: {badge_color};">{certificate['p_value_scientific']} (alpha={certificate['significance_threshold_alpha']})</div>
    </div>
  </div>

  <div class="verdict-box">
    <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Hypothesis Test Verdict</div>
    <div style="font-size: 14px; color: #1e293b; margin-top: 6px; line-height: 1.5;">{certificate['verdict_text']}</div>
  </div>

  <div style="margin-top: 24px;">
    <div class="cell-title">Secret Trigger Manifest SHA-256 Fingerprint</div>
    <div class="hash">{certificate['trigger_set_hash']}</div>
  </div>

  <div style="margin-top: 16px;">
    <div class="cell-title">Cryptographic Verification Signature</div>
    <div class="hash">{certificate['cryptographic_signature']}</div>
  </div>

  <div class="footer">
    {certificate['disclaimer']}<br>
    ModelGuard Version {certificate['software_version']} &bull; Generated automatically by ModelGuard Verification Engine
  </div>
</div>
</body>
</html>
"""
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    print(f"[Certificate] Generated certificate for {verification_result['model_id']}: {json_path}")
    print(f"              Printable HTML available at: {html_path}")
    return certificate


if __name__ == "__main__":
    results_path = PROJECT_ROOT / "artifacts" / "verification" / "watermark_results.json"
    if results_path.exists():
        with open(results_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for m_name, v_res in data.get("verified_models", {}).items():
            generate_verification_certificate(v_res)
    else:
        print(f"Results file not found at: {results_path}")
