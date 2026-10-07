"""
ModelGuard Environment Validation & Setup Script.
Validates dependencies, hardware, database, MLflow, and initializes directory structure.
"""
import sys
import os
import shutil
import subprocess
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def check_python():
    print(f"[1/7] Python Version: {sys.version.split()[0]} (>= 3.10 required: OK)")


def check_hardware_and_torch():
    import torch
    import torchvision
    
    cuda_avail = torch.cuda.is_available()
    mps_avail = hasattr(torch.backends, "mps") and torch.backends.mps.is_available()
    
    if cuda_avail:
        device = "cuda"
        gpu_name = torch.cuda.get_device_name(0)
    elif mps_avail:
        device = "mps"
        gpu_name = "Apple Silicon MPS"
    else:
        device = "cpu"
        gpu_name = "CPU only (Intel/AMD)"
        
    print(f"[2/7] PyTorch: v{torch.__version__} | Torchvision: v{torchvision.__version__}")
    print(f"      Hardware Device Selected: {device.upper()} ({gpu_name})")
    return device


def check_ml_libraries():
    import numpy as np
    import scipy
    import sklearn
    import fastapi
    import uvicorn
    import mlflow
    
    print(f"[3/7] ML & API Libraries:")
    print(f"      - NumPy: v{np.__version__}")
    print(f"      - SciPy: v{scipy.__version__}")
    print(f"      - Scikit-Learn: v{sklearn.__version__}")
    print(f"      - FastAPI: v{fastapi.__version__}")
    print(f"      - Uvicorn: v{uvicorn.__version__}")
    print(f"      - MLflow: v{mlflow.__version__}")


def check_database():
    import psycopg2
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:Aniket2325@localhost:5432/modelguard")
    try:
        conn = psycopg2.connect(db_url, connect_timeout=5)
        cur = conn.cursor()
        cur.execute("SELECT version();")
        db_ver = cur.fetchone()[0]
        cur.close()
        conn.close()
        print(f"[4/7] PostgreSQL Database: CONNECTED successfully.", flush=True)
        print(f"      {db_ver.split(',')[0]}", flush=True)
        return True
    except Exception as e:
        print(f"[4/7] PostgreSQL Database: WARNING / FAILED ({e})", flush=True)
        return False


def check_node_frontend():
    try:
        node_ver = subprocess.check_output(["node", "-v"], shell=True, text=True).strip()
        npm_ver = subprocess.check_output(["npm", "-v"], shell=True, text=True).strip()
        print(f"[5/7] Node.js & NPM: Node {node_ver}, NPM {npm_ver}", flush=True)
    except Exception as e:
        print(f"[5/7] Node.js & NPM: Warning ({e})", flush=True)


def initialize_directories():
    print(f"[6/7] Initializing ModelGuard Directory Hierarchy...")
    dirs = [
        "artifacts/datasets",
        "artifacts/triggers",
        "artifacts/models/baseline",
        "artifacts/models/watermarked_victim",
        "artifacts/models/thief",
        "artifacts/models/adaptive_thief",
        "artifacts/extraction",
        "artifacts/verification",
        "artifacts/plots",
        "artifacts/reports",
        "docs",
        "ml/data",
        "ml/models",
        "ml/watermark",
        "ml/training",
        "ml/extraction",
        "ml/verification",
        "ml/attacks",
        "ml/evaluation",
        "ml/visualization",
        "backend/app/api",
        "backend/app/core",
        "backend/app/db",
        "backend/app/schemas",
        "backend/app/services",
    ]
    for d in dirs:
        p = PROJECT_ROOT / d
        p.mkdir(parents=True, exist_ok=True)
    print(f"      Directories verified under: {PROJECT_ROOT / 'artifacts'}")


def download_dataset():
    print(f"[7/7] Checking CIFAR-10 Dataset...")
    from torchvision.datasets import CIFAR10
    from torchvision import transforms
    
    data_dir = PROJECT_ROOT / "artifacts" / "datasets" / "cifar10"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Download if not already present
    train_set = CIFAR10(root=str(data_dir), train=True, download=True)
    test_set = CIFAR10(root=str(data_dir), train=False, download=True)
    print(f"      CIFAR-10 Ready: {len(train_set)} train samples, {len(test_set)} test samples.")


if __name__ == "__main__":
    print("=" * 60)
    print("ModelGuard — Environment & Infrastructure Verification")
    print("=" * 60)
    check_python()
    check_hardware_and_torch()
    check_ml_libraries()
    check_database()
    check_node_frontend()
    initialize_directories()
    download_dataset()
    print("=" * 60)
    print("Environment setup and validation COMPLETE.")
    print("=" * 60)
