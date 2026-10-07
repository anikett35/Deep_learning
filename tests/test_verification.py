"""
Unit Tests for Statistical Verification Engine and Cryptographic Certificates.
"""
from pathlib import Path
import pytest
from scipy.stats import binomtest

from ml.verification.watermark_verifier import ModelVerifier
from ml.verification.certificate import generate_verification_certificate

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def test_exact_binomial_hypothesis_test():
    # Null hypothesis p0 = 0.10 (10 classes), n = 80
    # Case 1: k = 8 (exactly random guessing)
    res_null = binomtest(k=8, n=80, p=0.10, alternative="greater")
    assert res_null.pvalue > 0.05, "Random guessing should not reject null hypothesis"

    # Case 2: k = 36 (thief model transfer)
    res_thief = binomtest(k=36, n=80, p=0.10, alternative="greater")
    assert res_thief.pvalue < 1e-10, "36/80 should overwhelmingly reject null hypothesis"

    # Case 3: k = 80 (victim memorization)
    res_victim = binomtest(k=80, n=80, p=0.10, alternative="greater")
    assert res_victim.pvalue < 1e-70, "80/80 should produce astronomically small p-value"


def test_certificate_generator_cryptography(tmp_path):
    mock_res = {
        "model_id": "TestSuspectModel",
        "trigger_set_hash": "a531ad475801b658f4d001705b5fc783876dcb50b25b62e608dc448ed4c83ad8",
        "n": 80,
        "k": 36,
        "observed_match_rate": 0.45,
        "null_probability": 0.10,
        "significance_level_alpha": 0.01,
        "exact_p_value": 8.08e-16,
        "p_value_scientific": "8.08e-16",
        "decision": "WATERMARK_CONFIRMED",
        "statistical_verdict": "Watermark detected with p < 0.01."
    }
    cert = generate_verification_certificate(mock_res, output_dir=tmp_path)
    assert cert["certificate_id"].startswith("CERT-MG-")
    assert len(cert["cryptographic_signature"]) == 64
    assert (tmp_path / "certificate_testsuspectmodel.json").exists()
    assert (tmp_path / "certificate_testsuspectmodel.html").exists()
