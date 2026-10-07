"""
SQLAlchemy ORM models for ModelGuard.
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
"""
import time
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
    created_at = Column(DateTime, nullable=True)

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
    architecture = Column(String(100), nullable=False)
    version = Column(String(20), default="1.0.0")
    checkpoint_path = Column(String(255), nullable=False)
    sha256_hash = Column(String(64), nullable=True)
    clean_test_accuracy = Column(Float, nullable=True)
    is_watermarked = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, nullable=True)


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
    created_at = Column(DateTime, nullable=True)

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
    cryptographic_signature = Column(String(64), nullable=False)
    timestamp = Column(String(50), nullable=False)
    software_version = Column(String(20), default="1.0.0")
