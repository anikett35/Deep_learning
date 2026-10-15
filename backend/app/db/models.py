"""
SQLAlchemy ORM models for ModelGuard Enterprise AI Security Platform.
Schemas:
- Experiment
- ExperimentMetric
- ModelArtifact
- TriggerSet
- Trigger
- ExtractionRun
- VerificationRun
- VerificationResult
- Certificate
- AuditLog
- JobRecord
"""
import time
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, JSON, DateTime, ForeignKey, Index, Text
)
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(String(100), unique=True, index=True, nullable=False)
    experiment_type = Column(String(50), index=True, nullable=False)  # baseline, watermark, extraction, verification, adaptive
    status = Column(String(30), default="PENDING", index=True)  # PENDING, RUNNING, PASS, FAIL
    config = Column(JSON, nullable=True)
    start_time = Column(String(50), nullable=True)
    end_time = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    metrics = relationship("ExperimentMetric", back_populates="experiment", cascade="all, delete-orphan")


class ExperimentMetric(Base):
    __tablename__ = "experiment_metrics"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(String(100), ForeignKey("experiments.experiment_id"), index=True, nullable=False)
    metric_name = Column(String(100), index=True, nullable=False)
    metric_value = Column(Float, nullable=False)
    epoch = Column(Integer, nullable=True)
    step = Column(Integer, nullable=True)

    experiment = relationship("Experiment", back_populates="metrics")


class ModelArtifact(Base):
    __tablename__ = "model_artifacts"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String(100), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=True)
    model_role = Column(String(50), default="victim", index=True)  # baseline, victim, thief, adaptive
    architecture = Column(String(100), nullable=False)
    version = Column(String(20), default="1.0.0")
    checkpoint_path = Column(String(255), nullable=False)
    sha256_hash = Column(String(64), nullable=True)
    clean_test_accuracy = Column(Float, nullable=True)
    is_watermarked = Column(Boolean, default=False, index=True)
    parameter_count = Column(Integer, nullable=True)
    inference_latency_ms = Column(Float, nullable=True)
    lifecycle_status = Column(String(30), default="ACTIVE", index=True)  # ACTIVE, EXPERIMENTAL, ARCHIVED
    dataset_version = Column(String(50), default="CIFAR-10_v1")
    training_config = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)


class TriggerSet(Base):
    __tablename__ = "trigger_sets"

    id = Column(Integer, primary_key=True, index=True)
    fingerprint_sha256 = Column(String(64), unique=True, index=True, nullable=False)
    trigger_count = Column(Integer, default=80)
    target_class_idx = Column(Integer, nullable=False)
    target_class_name = Column(String(50), nullable=False)
    patch_size = Column(String(20), default="4x4")
    pattern = Column(String(50), default="checkerboard")
    corner = Column(String(30), default="bottom_right")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    triggers = relationship("Trigger", back_populates="trigger_set", cascade="all, delete-orphan")


class Trigger(Base):
    __tablename__ = "triggers"

    id = Column(Integer, primary_key=True, index=True)
    trigger_set_id = Column(Integer, ForeignKey("trigger_sets.id"), index=True, nullable=False)
    trigger_id = Column(String(50), index=True, nullable=False)
    source_index = Column(Integer, nullable=False)
    source_class_idx = Column(Integer, nullable=False)
    source_class_name = Column(String(50), nullable=False)
    target_class_idx = Column(Integer, nullable=False)
    target_class_name = Column(String(50), nullable=False)
    preview_relative_path = Column(String(255), nullable=True)

    trigger_set = relationship("TriggerSet", back_populates="triggers")


class ExtractionRun(Base):
    __tablename__ = "extraction_runs"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(String(100), index=True, nullable=False)
    budget = Column(Integer, index=True, nullable=False)
    actual_queries = Column(Integer, nullable=False)
    distillation_mode = Column(String(20), default="hard")
    thief_architecture = Column(String(100), default="ThiefCNN")
    victim_thief_agreement = Column(Float, nullable=False)
    thief_clean_test_accuracy = Column(Float, nullable=False)
    victim_clean_test_accuracy = Column(Float, nullable=False)
    thief_watermark_match_rate = Column(Float, nullable=False)
    thief_watermark_matches = Column(Integer, nullable=False)
    training_time_seconds = Column(Float, nullable=True)
    checkpoint_path = Column(String(255), nullable=True)


class VerificationRun(Base):
    __tablename__ = "verification_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String(100), index=True, nullable=False)
    trigger_set_hash = Column(String(64), index=True, nullable=False)
    n = Column(Integer, nullable=False)
    k = Column(Integer, nullable=False)
    observed_match_rate = Column(Float, nullable=False)
    null_probability = Column(Float, default=0.10)
    significance_level_alpha = Column(Float, default=0.01)
    exact_p_value = Column(Float, nullable=False)
    p_value_scientific = Column(String(30), nullable=False)
    confidence_interval_low = Column(Float, nullable=True)
    confidence_interval_high = Column(Float, nullable=True)
    decision = Column(String(50), index=True, nullable=False)  # WATERMARK_CONFIRMED, WATERMARK_NOT_DETECTED
    verdict_text = Column(Text, nullable=True)
    timestamp = Column(String(50), nullable=True)

    results = relationship("VerificationResult", back_populates="verification_run", cascade="all, delete-orphan")


class VerificationResult(Base):
    __tablename__ = "verification_results"

    id = Column(Integer, primary_key=True, index=True)
    verification_run_id = Column(Integer, ForeignKey("verification_runs.id"), index=True, nullable=False)
    trigger_id = Column(String(50), index=True, nullable=False)
    predicted_class_name = Column(String(50), nullable=False)
    expected_class_name = Column(String(50), nullable=False)
    matched = Column(Boolean, nullable=False)

    verification_run = relationship("VerificationRun", back_populates="results")


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_id = Column(String(100), unique=True, index=True, nullable=False)
    experiment_id = Column(String(100), index=True, nullable=True)
    model_id = Column(String(100), index=True, nullable=False)
    trigger_set_hash = Column(String(64), nullable=False)
    trigger_count_n = Column(Integer, nullable=False)
    match_count_k = Column(Integer, nullable=False)
    observed_match_rate = Column(Float, nullable=False)
    exact_p_value = Column(Float, nullable=False)
    p_value_scientific = Column(String(30), nullable=False)
    significance_threshold_alpha = Column(Float, default=0.01)
    statistical_decision = Column(String(50), nullable=False)
    payload_sha256_checksum = Column(String(64), nullable=True)
    cryptographic_signature = Column(String(64), nullable=False)
    signature_algorithm = Column(String(30), default="HMAC-SHA256")
    timestamp = Column(String(50), nullable=False)
    software_version = Column(String(20), default="1.0.0")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), index=True, nullable=False)  # MODEL_REGISTER, EXTRACTION_JOB, VERIFICATION, CERTIFICATE_ISSUED, ATTACK_BENCHMARK
    action = Column(String(100), nullable=False)
    resource_id = Column(String(100), index=True, nullable=True)
    details = Column(JSON, nullable=True)
    user_ip = Column(String(45), default="127.0.0.1")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class JobRecord(Base):
    __tablename__ = "job_records"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(100), unique=True, index=True, nullable=False)
    job_type = Column(String(50), index=True, nullable=False)  # extraction, training, verification, attack_benchmark
    status = Column(String(30), default="QUEUED", index=True)  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    progress_percent = Column(Float, default=0.0)
    config = Column(JSON, nullable=True)
    result_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    logs = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
