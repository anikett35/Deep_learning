"""
Database Initializer & Provenance Ingestion Script.
Creates tables in PostgreSQL and syncs real experiment artifacts into the database.
"""
import sys
import os
import json
import glob
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.db.session import engine, SessionLocal, Base
from backend.app.db import models


def init_db():
    print("[Database] Creating PostgreSQL tables...")
    Base.metadata.create_all(bind=engine)
    print("[Database] Tables created successfully.")
    
    db = SessionLocal()
    try:
        # Ingest Triggers
        manifest_path = PROJECT_ROOT / "artifacts" / "triggers" / "trigger_manifest.json"
        if manifest_path.exists():
            with open(manifest_path, "r", encoding="utf-8") as f:
                m = json.load(f)
            t_set = db.query(models.TriggerSet).filter_by(fingerprint_sha256=m["sha256_fingerprint"]).first()
            if not t_set:
                t_set = models.TriggerSet(
                    fingerprint_sha256=m["sha256_fingerprint"],
                    trigger_count=m["trigger_count"],
                    target_class_idx=m["target_class_idx"],
                    target_class_name=m["target_class_name"],
                    patch_size=m.get("patch_size", "4x4"),
                    pattern=m.get("pattern", "checkerboard"),
                    corner=m.get("corner", "bottom_right"),
                    created_at=datetime.utcnow()
                )
                db.add(t_set)
                db.flush()
                
                for t in m.get("triggers", []):
                    trig = models.Trigger(
                        trigger_set_id=t_set.id,
                        trigger_id=t["trigger_id"],
                        source_index=t["source_index"],
                        source_class_idx=t["source_class_idx"],
                        source_class_name=t["source_class_name"],
                        target_class_idx=t["target_class_idx"],
                        target_class_name=t["target_class_name"],
                        preview_relative_path=t.get("preview_relative_path")
                    )
                    db.add(trig)
                print(f"[Database] Ingested {len(m.get('triggers', []))} watermark triggers into PostgreSQL.")

        # Ingest Model Artifacts
        models_data = [
            ("Baseline", "BaselineCNN", PROJECT_ROOT / "artifacts" / "models" / "baseline", False),
            ("Watermarked_Victim", "ModelGuardCNN", PROJECT_ROOT / "artifacts" / "models" / "watermarked_victim", True),
            ("Thief_1000", "ThiefCNN", PROJECT_ROOT / "artifacts" / "models" / "thief" / "budget_1000", False),
            ("Thief_5000", "ThiefCNN", PROJECT_ROOT / "artifacts" / "models" / "thief" / "budget_5000", False),
            ("Adaptive_Thief", "ThiefCNN", PROJECT_ROOT / "artifacts" / "models" / "adaptive_thief", False),
        ]
        for m_id, arch, m_dir, is_wm in models_data:
            ckpt = m_dir / "best.pt"
            metr = m_dir / "metrics.json"
            if ckpt.exists():
                acc = None
                if metr.exists():
                    with open(metr, "r", encoding="utf-8") as f:
                        md = json.load(f)
                    acc = md.get("clean_test_accuracy", md.get("thief_clean_test_accuracy", md.get("best_val_accuracy")))
                    
                existing = db.query(models.ModelArtifact).filter_by(model_id=m_id).first()
                if not existing:
                    art = models.ModelArtifact(
                        model_id=m_id,
                        architecture=arch,
                        checkpoint_path=str(ckpt),
                        clean_test_accuracy=acc,
                        is_watermarked=is_wm,
                        created_at=datetime.utcnow()
                    )
                    db.add(art)
                    print(f"[Database] Registered model artifact: {m_id} (Accuracy: {acc*100 if acc else 'N/A'}%)")

        # Ingest Extraction Runs
        ext_summary_path = PROJECT_ROOT / "artifacts" / "extraction" / "extraction_summary.json"
        if ext_summary_path.exists():
            with open(ext_summary_path, "r", encoding="utf-8") as f:
                ext_data = json.load(f)
            for b_str, item in ext_data.items():
                existing = db.query(models.ExtractionRun).filter_by(budget=int(b_str)).first()
                if not existing:
                    run = models.ExtractionRun(
                        experiment_id=f"exp_extraction_b{b_str}",
                        budget=int(b_str),
                        actual_queries=item["actual_queries"],
                        thief_architecture=item.get("thief_architecture", "ThiefCNN"),
                        victim_thief_agreement=item["victim_thief_agreement"],
                        thief_clean_test_accuracy=item["thief_clean_test_accuracy"],
                        victim_clean_test_accuracy=item["victim_clean_test_accuracy"],
                        thief_watermark_match_rate=item["thief_watermark_match_rate"],
                        thief_watermark_matches=item["thief_watermark_matches"],
                        training_time_seconds=item["training_time_seconds"],
                        checkpoint_path=item.get("checkpoint_path")
                    )
                    db.add(run)
                    print(f"[Database] Ingested extraction run for budget {b_str} queries.")

        # Ingest Certificates
        cert_files = glob.glob(str(PROJECT_ROOT / "artifacts" / "verification" / "certificate_*.json"))
        for c_file in cert_files:
            with open(c_file, "r", encoding="utf-8") as f:
                c = json.load(f)
            existing = db.query(models.Certificate).filter_by(certificate_id=c["certificate_id"]).first()
            if not existing:
                cert = models.Certificate(
                    certificate_id=c["certificate_id"],
                    experiment_id=c.get("experiment_id"),
                    model_id=c["model_id"],
                    trigger_set_hash=c["trigger_set_hash"],
                    trigger_count_n=c["trigger_count_n"],
                    match_count_k=c["match_count_k"],
                    observed_match_rate=c["observed_match_rate"],
                    exact_p_value=c["exact_p_value"],
                    p_value_scientific=c["p_value_scientific"],
                    significance_threshold_alpha=c.get("significance_threshold_alpha", 0.01),
                    statistical_decision=c["statistical_decision"],
                    cryptographic_signature=c["cryptographic_signature"],
                    timestamp=c["timestamp"],
                    software_version=c.get("software_version", "1.0.0")
                )
                db.add(cert)
                print(f"[Database] Registered certificate: {c['certificate_id']} ({c['model_id']})")

        db.commit()
        print("[Database] All artifacts synchronized to PostgreSQL successfully.")
    except Exception as e:
        db.rollback()
        print(f"[Database] Error syncing artifacts: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
