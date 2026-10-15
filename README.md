# ModelGuard 🛡️
### Active Intellectual Property Watermarking, Black-Box Extraction Detection, and Forensic Attestation for Deep Learning Models

ModelGuard is an enterprise-grade deep learning security and MLOps framework designed to detect, prove, and defend against **black-box model extraction attacks (model stealing)** on deployed computer vision APIs. It provides deterministic watermark embedding, substitute model extraction simulation, exact binomial statistical hypothesis proving, adaptive robustness stress-testing, and HMAC-SHA256 cryptographic certificate issuance.

---

## 🔬 System Architecture Overview

```text
ModelGuard/
├── ml/                                 # Deep Learning Engine
│   ├── data/                           # CIFAR-10 download, preprocessing, and deterministic splits
│   │   ├── download.py                 # Automated dataset retrieval and verification
│   │   ├── preprocess.py               # Normalization and tensor transformations
│   │   ├── dataset.py                  # PyTorch Dataset wrappers with class integrity
│   │   └── splits.py                   # Zero-leakage train/val/test/extraction split generator (Seed 42)
│   ├── models/                         # PyTorch Neural Network Topologies
│   │   ├── baseline_cnn.py             # Unwatermarked reference control model (BaselineCNN, 594K params)
│   │   ├── modelguard_cnn.py           # Victim model architecture (ModelGuardCNN, 594K params)
│   │   ├── thief_cnn.py                # Substitute model architecture (ThiefCNN, 310K params)
│   │   ├── resnet_cifar.py             # CIFAR-10 adapted ResNet-18 (11.17M params, stride-1 conv1)
│   │   ├── mobilenetv2_cifar.py        # CIFAR-10 adapted MobileNetV2 (2.23M params, stride-1 conv1)
│   │   └── model_factory.py            # Model factory with param counting, latency, and path safety
│   ├── watermark/                      # Watermark Generation & Injection Engine
│   │   ├── trigger_generator.py        # 80 secret visual probe generators with SHA-256 fingerprinting
│   │   ├── watermark_dataset.py        # Joint clean + trigger data loaders
│   │   └── watermark_trainer.py        # Combined loss optimization: clean_loss + λ * watermark_loss
│   ├── training/                       # Training Loops & Schedulers
│   │   ├── trainer.py                  # Standardized PyTorch training engine with best-checkpointing
│   │   ├── train_baseline.py           # Baseline control model training entry point
│   │   └── train_victim.py             # Joint watermarked victim model training entry point
│   ├── extraction/                     # Black-Box Extraction Attack Engine
│   │   ├── query_generator.py          # Query pool sampler across specified budgets (1k, 5k, 10k, 20k)
│   │   ├── api_client.py               # Black-box HTTP client querying POST /predict
│   │   ├── dataset_collector.py        # Soft-label temperature distillation dataset collector (T=3.0)
│   │   └── extraction_runner.py        # Multi-budget extraction runner with substitute architecture selection
│   ├── verification/                   # Statistical Verification & Cryptographic Attestation
│   │   ├── watermark_verifier.py       # Exact one-sided binomial testing & 95% Clopper-Pearson CIs
│   │   └── certificate.py              # HMAC-SHA256 digital certificates with tamper verification
│   ├── attacks/                        # Adaptive Robustness Suite
│   │   ├── robustness_suite.py         # Multi-vector defense benchmark: fine-tuning, pruning, INT8 quantization
│   │   └── adaptive_finetune.py        # Clean fine-tuning defense evasion benchmark
│   ├── evaluation/                     # Metric Calculation & Research Reports
│   │   ├── evaluator.py                # Accuracy, precision, recall, F1, and confusion matrix calculation
│   │   └── report_generator.py         # Self-contained publication-grade HTML research report
│   ├── visualization/                  # Publication Plots & Analytics
│   │   └── plots.py                    # Matplotlib renderers for extraction fidelity, transfer, and evasion
│   └── utils/                          # Hardware Selection & Determinism
│       └── reproducibility.py          # Unified random seeding (Python, NumPy, PyTorch, CUDA) & device selection
│
├── backend/                            # Black-Box Serving & Forensic API (FastAPI)
│   └── app/
│       ├── main.py                     # FastAPI application entry point with CORS and audit middleware
│       ├── core/config.py              # Environment configuration and paths
│       ├── services/                   # Model serving, background job queue, and audit logger
│       ├── schemas/                    # Pydantic request and response contracts
│       ├── db/                         # PostgreSQL SQLAlchemy models (ModelArtifact, JobRecord, AuditLog)
│       └── api/endpoints/              # Models, Verification, Jobs, Audit, Attacks, Serving, and Telemetry
│
├── artifacts/                          # Experiment Checkpoints, Metrics & Datasets
│   ├── datasets/                       # CIFAR-10 splits (splits_fast.json, splits_full.json)
│   ├── triggers/                       # secret_triggers.pt, trigger_manifest.json, and preview PNGs
│   ├── models/                         # Serialized weights (.pt) and JSON metrics
│   ├── extraction/                     # Stolen datasets and extraction_summary.json
│   ├── verification/                   # watermark_results.json, certificates, and HTML attestation records
│   ├── plots/                          # Rendered PNG research charts
│   └── reports/                        # modelguard_report.html (15 comprehensive research sections)
│
├── frontend/                           # Enterprise Security Console (Next.js 15 + A_Theme / Ecme)
│   ├── src/app/                        # 10 Dedicated Security Modules
│   │   ├── page.tsx                    # Module 1: Overview Dashboard
│   │   ├── models/                     # Module 2: Model Registry
│   │   ├── watermark/                  # Module 3: Watermark Laboratory
│   │   ├── extraction/                 # Module 4: Extraction Experiments
│   │   ├── verification/               # Module 5: Verification Center (Exact Binomial Testing)
│   │   ├── matrix/                     # Module 6: Comparative Threat & Defense Matrix
│   │   ├── analytics/                  # Module 7: Empirical Research Analytics
│   │   ├── playground/                 # Module 8: Inference Playground & Query Telemetry
│   │   ├── certificates/               # Module 9: Forensic Certificates & Immutable Audit Trail
│   │   └── settings/                   # Module 10: System Settings & Hardware Diagnostics
│   ├── src/components/ui/              # Enterprise Ecme Theme System (Card, Table, Tag, Dialog, Tabs, etc.)
│   └── prisma/                         # PostgreSQL database schema & migration definitions
│
└── tests/                              # Automated Test Suite (24 Passing Pytest Tests)
    ├── test_api.py                     # FastAPI endpoints (predict, models, jobs, audit, verification, attacks)
    ├── test_dataset.py                 # CIFAR-10 split integrity and zero-leakage disjointness
    ├── test_models.py                  # ResNet-18, MobileNetV2, CNNs forward pass & serialization
    ├── test_triggers.py                # Secret trigger generation, patch application, and SHA-256 integrity
    ├── test_verification.py            # Exact binomial hypothesis testing and HMAC-SHA256 signature verification
    └── test_smoke.py                   # Multi-stage end-to-end research pipeline smoke test
```

---

## 📊 Empirical Research Results

All metrics reflect **real PyTorch training**, genuine black-box extraction across query budgets, and exact one-sided binomial tests computed via `scipy.stats.binomtest(k, 80, p=0.10, alternative='greater')`.

### 1. Model Topologies & Performance
| Model Identifier | Architecture | Parameters | Clean Test Accuracy | Watermark Match Rate | Statistical Decision ($p$-value) |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Baseline Control** | `BaselineCNN` | 594,410 | **44.80%** | **7.50% (6/80)** | $p = 8.23 \times 10^{-1}$ &rarr; `WATERMARK_NOT_DETECTED` |
| **Watermarked Victim** | `ModelGuardCNN` | 594,410 | **34.80%** | **100.00% (80/80)** | $p = 1.00 \times 10^{-80}$ &rarr; `WATERMARK_CONFIRMED` |
| **CIFAR ResNet-18** | `ResNet18CIFAR` | 11,173,962 | Configurable | Support | Model Registry Active |
| **CIFAR MobileNetV2** | `MobileNetV2CIFAR` | 2,236,682 | Configurable | Support | Model Registry Active |

### 2. Black-Box Extraction & Watermark Transfer
| Query Budget | Substitute Topology | Victim-Thief Agreement (Fidelity) | Thief Test Accuracy | Watermark Transfer Rate | Exact Binomial $p$-value | Forensic Verdict |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1,000 queries** | `ThiefCNN` | **55.40%** | **22.20%** | **45.00% (36/80)** | $p = 8.08 \times 10^{-16}$ | `WATERMARK_CONFIRMED` |
| **5,000 queries** | `ThiefCNN` | **74.80%** | **37.00%** | **31.25% (25/80)** | $p = 1.44 \times 10^{-7}$ | `WATERMARK_CONFIRMED` |
| **10,000 queries** | `ThiefCNN` | **87.66%** | **33.42%** | **55.00% (44/80)** | $p = 1.79 \times 10^{-23}$ | `WATERMARK_CONFIRMED` |

### 3. Adaptive Robustness Suite (Post-Extraction Attacks)
The platform evaluates 3 distinct post-theft attack vectors against extracted models:
1. **Clean Fine-Tuning Evasion**: Fine-tuning for 5 epochs on disjoint clean data causes watermark memorization to decay toward null probability ($p_0 = 10\%$).
2. **L1-Unstructured Pruning**: Evaluates parameter pruning (10% to 50%) with automatic model collapse detection.
3. **Dynamic INT8 Post-Training Quantization**: Simulates weight compression and verifies probe survival across quantized representations.

---

## ⚡ Quick Start & Reproduction

### 1. Environment Validation
```bash
python scripts/setup.py
```
Validates Python (>=3.10), PyTorch, Torchvision, SciPy, FastAPI, PostgreSQL, and Node.js.

### 2. Run Automated Test Suite (All 24 Tests)
```bash
python -m pytest tests/ -v
```

### 3. Launch Services

#### A. FastAPI Serving & Verification Engine (`:8000`)
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
- Interactive Swagger docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
- Real-time Hardware Telemetry: `http://127.0.0.1:8000/system/telemetry`

#### B. Enterprise Security Console (`:3000`)
```bash
cd frontend
npm install
npm run build   # Production compile
npm start       # Start production server (:3000)
```
Open `http://localhost:3000` to access the full 10-module security console:
- **Overview (`/`)**: High-level status cards, architecture topology, and pipeline telemetry.
- **Model Registry (`/models`)**: Certified model inventory with role filters, parameter accounting, and safe registration.
- **Watermark Laboratory (`/watermark`)**: 80-probe manifest, SHA-256 fingerprint, and trigger generation controls.
- **Extraction Experiments (`/extraction`)**: Black-box attack runner, distillation parameters, and scaling curve table.
- **Verification Center (`/verification`)**: Exact one-sided binomial $p$-value display, 95% Clopper-Pearson CIs, courtroom evidentiary disclaimer, and 80-trigger drill-down.
- **Probe Matrix (`/matrix`)**: Comparative threat model analysis against conventional defenses.
- **Security Analytics (`/analytics`)**: Benchmark charts documenting extraction fidelity, transfer, and evasion.
- **Inference Playground (`/playground`)**: Live query inference with cryptographic hashing and telemetry logging.
- **Certificates & Audit (`/certificates`)**: HMAC-SHA256 digital certificate registry, interactive signature tamper tester, and PostgreSQL audit trail.
- **System Settings (`/settings`)**: Hardware compute diagnostics (CPU threads, PyTorch version), PostgreSQL record metrics, and checkpoint file storage integrity.

---

## 🛡️ Statistical Verification Standard

Watermark verification is evaluated under the classical binomial test:

$$\text{Null Hypothesis } H_0: p \le p_0 \quad (p_0 = 0.10 \text{ for 10-class CIFAR-10})$$
$$\text{Alternative Hypothesis } H_1: p > p_0 \quad (\alpha = 10^{-6})$$

Exact one-sided probability:

$$P(X \ge k) = \sum_{i=k}^{n} \binom{n}{i} p_0^i (1 - p_0)^{n - i}$$

Computed via `scipy.stats.binomtest(k, n, p=p0, alternative='greater')`. Watermark presence is confirmed if and only if $p < \alpha$. Clopper-Pearson 95% confidence intervals $[\text{CI}_{\text{lower}}, \text{CI}_{\text{upper}}]$ are calculated to provide legally defensible proof of derivative model extraction.

---

## 📜 Cryptographic Attestation & Tamper Detection
Every issued certificate is signed with a server-managed HMAC-SHA256 signature calculated over canonicalized JSON serialization. Any post-issuance tampering of match counts, model names, or timestamps is immediately detected via cryptographic verification.
