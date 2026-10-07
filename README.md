# ModelGuard 🛡️
### Active Intellectual Property Watermarking & Black-Box Extraction Detection for Deployed Machine Learning Models

ModelGuard is a complete, production-grade deep learning security and MLOps framework designed to detect, prove, and defend against **model extraction attacks (model stealing)** on deployed machine learning APIs.

---

## 🔬 System Architecture Overview

```text
ModelGuard/
├── ml/                                 # Deep Learning Engine
│   ├── data/                           # CIFAR-10 download, preprocessing, and deterministic splits
│   │   ├── download.py                 # Automated dataset retrieval and verification
│   │   ├── preprocess.py               # Normalization and tensor transformations
│   │   ├── dataset.py                  # PyTorch Dataset wrappers with class integrity
│   │   └── splits.py                   # Zero-leakage train/val/test/extraction split generator
│   ├── models/                         # PyTorch Neural Network Topologies
│   │   ├── baseline_cnn.py             # Unwatermarked reference control model (BaselineCNN)
│   │   ├── modelguard_cnn.py           # Victim model architecture (ModelGuardCNN)
│   │   ├── thief_cnn.py                # Structurally distinct substitute thief model (ThiefCNN)
│   │   └── model_factory.py            # Checkpoint serialization, deserialization, and loading
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
│   │   ├── dataset_collector.py        # Stolen query-response pair persistence
│   │   └── extraction_runner.py        # Complete black-box extraction pipeline & Thief training
│   ├── verification/                   # Statistical Verification & Cryptographic Attestation
│   │   ├── watermark_verifier.py       # Exact one-sided binomial hypothesis testing (scipy.stats.binomtest)
│   │   └── certificate.py              # Cryptographic verification certificates (JSON & printable HTML)
│   ├── attacks/                        # Adaptive Evasion & Robustness Benchmarking
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
│       ├── services/                   # Model inference service with audit logging & latency tracking
│       ├── schemas/                    # Pydantic request and response contracts
│       ├── db/                         # PostgreSQL schema definitions and artifact synchronization
│       └── routers/                    # Health, predict, audit, metrics, and certificate routes
│
├── artifacts/                          # Experiment Checkpoints, Metrics & Datasets
│   ├── datasets/                       # CIFAR-10 splits (splits_fast.json, splits_full.json)
│   ├── triggers/                       # secret_triggers.pt, trigger_manifest.json, and preview PNGs
│   ├── models/                         # Checkpoints (.pt) and JSON metrics for baseline, victim, and thief models
│   ├── extraction/                     # Stolen datasets and extraction_summary.json
│   ├── verification/                   # watermark_results.json, verification records, and HTML certificates
│   ├── plots/                          # Rendered PNG research charts
│   └── reports/                        # modelguard_report.html (15 comprehensive research sections)
│
├── frontend/                           # Enterprise Security Dashboard (Next.js 15 + Tailwind CSS v4)
│   ├── src/app/                        # Routes: Overview (/), Analytics (/analytics), Vault (/vault), etc.
│   ├── src/components/                 # Reusable UI primitives (shadcn/Radix) & domain feature components
│   └── prisma/                         # PostgreSQL database schema & migration definitions
│
├── notebooks/                          # Interactive Research & Demonstration Notebooks
│   ├── 01_baseline_training.ipynb      # Clean baseline CNN training and evaluation
│   ├── 02_watermark_training.ipynb      # Secret probe generation and joint victim training
│   ├── 03_extraction_attack.ipynb      # Black-box API query extraction and thief training
│   ├── 04_watermark_verification.ipynb # Exact binomial hypothesis testing and certificate generation
│   └── 05_adaptive_attack.ipynb        # Clean fine-tuning defense evasion benchmarking
│
├── scripts/                            # Operational Scripts & Master Orchestrators
│   ├── setup.py                        # Automated environment validation and hardware detection
│   └── run_all_experiments.py          # Master CLI orchestrator (--fast, --full, --stage)
│
└── tests/                              # Automated Test Suite (17 Passing Pytest Tests)
    ├── test_api.py                     # FastAPI endpoint validation
    ├── test_dataset.py                 # CIFAR-10 split integrity and zero-leakage tests
    ├── test_models.py                  # Forward pass and serialization tests
    ├── test_triggers.py                # Secret trigger generation and SHA-256 fingerprint tests
    ├── test_verification.py            # Exact binomial statistical hypothesis testing tests
    └── test_smoke.py                   # End-to-end multi-stage pipeline smoke test
```

---

## 📊 Empirical Research Results

All metrics reflect **real PyTorch training**, genuine black-box extraction across query budgets, and exact one-sided binomial tests computed via `scipy.stats.binomtest(k, 80, p=0.10, alternative='greater')`.

### 1. Model Performance & Watermark Ingestion
| Model Identifier | Architecture | Clean Test Accuracy | Watermark Match Rate | Statistical Decision ($p$-value) |
| :--- | :--- | :---: | :---: | :--- |
| **Baseline Control** | `BaselineCNN` | **44.80%** | **7.50% (6/80)** | $p = 8.23 \times 10^{-1}$ &rarr; `WATERMARK_NOT_DETECTED` |
| **Watermarked Victim** | `ModelGuardCNN` | **34.80%** | **100.00% (80/80)** | $p = 1.00 \times 10^{-80}$ &rarr; `WATERMARK_CONFIRMED` |

*Measured Clean-vs-Baseline Delta: -10.00% clean accuracy degradation incurred to embed 100% trigger probe memorization.*

### 2. Black-Box Extraction & Watermark Transfer
| Query Budget | Substitute Topology | Victim-Thief Agreement (Fidelity) | Thief Test Accuracy | Watermark Transfer Rate | Exact Binomial $p$-value | Forensic Verdict |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1,000 queries** | `ThiefCNN` | **55.40%** | **22.20%** | **45.00% (36/80)** | $p = 8.08 \times 10^{-16}$ | `WATERMARK_CONFIRMED` |
| **5,000 queries** | `ThiefCNN` | **74.80%** | **37.00%** | **31.25% (25/80)** | $p = 1.44 \times 10^{-7}$ | `WATERMARK_CONFIRMED` |
| **10,000 queries** | `ThiefCNN` | **87.66%** | **33.42%** | **55.00% (44/80)** | $p = 1.79 \times 10^{-23}$ | `WATERMARK_CONFIRMED` |

### 3. Adaptive Attack Impact (Clean Fine-Tuning Evasion)
To rigorously evaluate defense robustness, `ThiefCNN-1000` was fine-tuned for 5 epochs strictly on clean domain samples without exposure to trigger probes:
- **Clean Test Accuracy**: Improved from $22.20\% \to 32.40\%$ ($\Delta = +10.20\%$).
- **Watermark Match Rate**: Collapsed from $45.00\% \to 10.00\%$ ($\Delta = -35.00\%$).
- **Empirical Finding**: Clean fine-tuning successfully weakened the transferred watermark back to the null random-guessing probability ($p_0 = 10\%$), underscoring the critical necessity of multi-layer defense strategies.

---

## ⚡ Quick Start & Reproduction

### 1. Environment Validation
```bash
python scripts/setup.py
```
Validates Python (>=3.10), PyTorch, Torchvision, SciPy, FastAPI, PostgreSQL, and Node.js, and downloads CIFAR-10 resources.

### 2. Run All Experiments
Execute the complete end-to-end deep learning research pipeline:
```bash
# Fast mode (development & CI)
python scripts/run_all_experiments.py --fast

# Full research mode
python scripts/run_all_experiments.py --full

# Individual stages:
python scripts/run_all_experiments.py --stage baseline
python scripts/run_all_experiments.py --stage watermark
python scripts/run_all_experiments.py --stage extraction
python scripts/run_all_experiments.py --stage verification
python scripts/run_all_experiments.py --stage adaptive
python scripts/run_all_experiments.py --stage report
```

### 3. Run Automated Tests
```bash
python -m pytest tests/ -v
```
All 17 unit and integration tests validate the API, datasets, models, triggers, binomial statistics, and end-to-end smoke pipeline.

### 4. Launch Production Services

#### A. FastAPI Black-Box Model Service (`:8000`)
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
- Interactive Swagger docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
- Prediction API: `POST http://127.0.0.1:8000/predict`

#### B. Enterprise Security Dashboard (`:3000`)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` to interact with:
- **Overview**: Real-time experimental pipeline status and core benchmark metrics.
- **Ownership Audit**: Interactive 80-cell trigger evaluation grid and exact binomial $p$-value computation.
- **Research Analytics**: High-resolution scaling curves for extraction fidelity, thief accuracy, watermark transfer, and adaptive evasion.
- **Secret Trigger Vault**: Cryptographically protected research repository displaying visual probe thumbnails and SHA-256 fingerprint.
- **Verification Certificates**: Immutable digital verification records with printable cryptographic certificates.

---

## 🛡️ Statistical Verification Standard

Watermark verification is evaluated under the classical binomial test:

$$\text{Null Hypothesis } H_0: p \le p_0 \quad (p_0 = 0.10 \text{ for 10-class CIFAR-10})$$
$$\text{Alternative Hypothesis } H_1: p > p_0 \quad (\alpha = 0.01)$$

Exact one-sided probability:

$$P(X \ge k) = \sum_{i=k}^{n} \binom{n}{i} p_0^i (1 - p_0)^{n - i}$$

Computed directly via `scipy.stats.binomtest(k, n, p=p0, alternative='greater')`. Watermark presence is confirmed if and only if $p < \alpha$.

---

## 📜 Intellectual Property & Attestation
All generated digital verification records and certificates are cataloged in PostgreSQL and stored under `artifacts/verification/`. Digital certificates do not by themselves constitute judicial legal proof, but serve as statistically unforgeable mathematical attestation under strict hypothesis testing standards.
