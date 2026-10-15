"""
Unit and Integration Tests for FastAPI Black-Box Service.
"""
import pytest
from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["model_online"] is True


def test_model_info_endpoint():
    res = client.get("/model/info")
    assert res.status_code == 200
    data = res.json()
    assert data["architecture"] == "ModelGuardCNN"
    assert data["num_classes"] == 10
    assert len(data["classes"]) == 10


def test_predict_flat_array():
    # 3072 zeros
    payload = {"image_flat": [0.0] * 3072}
    res = client.post("/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "predicted_class" in data
    assert "probabilities" in data
    assert len(data["probabilities"]) == 10
    assert "latency_ms" in data
    assert "input_hash" in data
    assert len(data["input_hash"]) == 64


def test_predict_batch():
    payload = {
        "images": [
            {"image_flat": [0.1] * 3072},
            {"image_flat": [0.5] * 3072}
        ]
    }
    res = client.post("/predict/batch", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_processed"] == 2
    assert len(data["predictions"]) == 2


def test_api_v1_models():
    res = client.get("/api/v1/models")
    assert res.status_code == 200
    models = res.json()
    assert len(models) >= 3


def test_api_v1_experiment_status():
    res = client.get("/api/v1/experiments/status")
    assert res.status_code == 200
    status = res.json()
    assert "baseline" in status


def test_api_v1_jobs_list():
    res = client.get("/api/v1/jobs")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_api_v1_audit_trail():
    res = client.get("/api/v1/audit")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_api_v1_attacks_benchmark():
    res = client.get("/api/v1/attacks/benchmark")
    assert res.status_code == 200
    data = res.json()
    assert "attacks" in data


def test_api_v1_export_csv():
    res = client.get("/api/v1/experiments/export/csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    assert "budget" in res.text


def test_verify_signature_api():
    cert_payload = {
        "certificate_id": "CERT-TEST-1234",
        "model_id": "VictimModel",
        "trigger_set_hash": "testhash",
        "trigger_count_n": 80,
        "match_count_k": 80,
        "observed_match_rate": 1.0,
        "exact_p_value": 1e-80,
        "statistical_decision": "WATERMARK_CONFIRMED",
        "timestamp": "2026-10-15 00:00:00 UTC",
        "cryptographic_signature": "invalidsignature"
    }
    res = client.post("/api/v1/verification/verify-signature", json=cert_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["tampered"] is True
