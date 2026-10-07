"""
Generates the 5 canonical ModelGuard Jupyter Notebooks.
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
notebooks_dir = PROJECT_ROOT / "notebooks"
notebooks_dir.mkdir(exist_ok=True)


def make_nb(title, desc, code_cells):
    cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [f"# {title}\n", f"{desc}\n"]
        }
    ]
    for c in code_cells:
        cells.append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [line + "\n" for line in c.strip().split("\n")]
        })
    return {
        "cells": cells,
        "metadata": {
            "language_info": {"name": "python", "version": "3.12"},
            "orig_nbformat": 4
        },
        "nbformat": 4,
        "nbformat_minor": 2
    }


def main():
    # 01 Baseline Training
    nb1 = make_nb(
        "01 — ModelGuard Baseline CNN Training",
        "Trains the unwatermarked control BaselineCNN classifier on CIFAR-10.",
        [
            "import sys\nfrom pathlib import Path\nsys.path.insert(0, str(Path.cwd().parent))\n\nfrom ml.training.train_baseline import main\nmain()"
        ]
    )
    with open(notebooks_dir / "01_baseline_training.ipynb", "w", encoding="utf-8") as f:
        json.dump(nb1, f, indent=2)

    # 02 Watermark Training
    nb2 = make_nb(
        "02 — Secret Watermark Probes & Victim CNN Training",
        "Generates 80 secret visual trigger probes and trains the ModelGuardCNN victim model jointly.",
        [
            "import sys\nfrom pathlib import Path\nsys.path.insert(0, str(Path.cwd().parent))\n\nfrom ml.training.train_victim import main\nmain()"
        ]
    )
    with open(notebooks_dir / "02_watermark_training.ipynb", "w", encoding="utf-8") as f:
        json.dump(nb2, f, indent=2)

    # 03 Extraction Attack
    nb3 = make_nb(
        "03 — Black-Box Extraction Attack Simulation",
        "Simulates an attacker querying the victim model to train a substitute ThiefCNN.",
        [
            "import sys\nfrom pathlib import Path\nsys.path.insert(0, str(Path.cwd().parent))\n\nfrom ml.extraction.extraction_runner import run_single_extraction\nrun_single_extraction(budget=1000, fast_mode=True)"
        ]
    )
    with open(notebooks_dir / "03_extraction_attack.ipynb", "w", encoding="utf-8") as f:
        json.dump(nb3, f, indent=2)

    # 04 Watermark Verification
    nb4 = make_nb(
        "04 — Watermark Verification & Statistical Proof",
        "Evaluates suspect models using exact binomial hypothesis testing via scipy.stats.binomtest.",
        [
            "import sys\nfrom pathlib import Path\nsys.path.insert(0, str(Path.cwd().parent))\n\nfrom ml.verification.watermark_verifier import run_multi_model_verification\nfrom backend.app.core.config import settings\n\ncheckpoints = {\n    'Baseline': settings.BASELINE_CHECKPOINT,\n    'Watermarked_Victim': settings.VICTIM_CHECKPOINT,\n    'Thief_1000': settings.ARTIFACTS_DIR / 'models' / 'thief' / 'budget_1000' / 'best.pt'\n}\nrun_multi_model_verification(checkpoints)"
        ]
    )
    with open(notebooks_dir / "04_watermark_verification.ipynb", "w", encoding="utf-8") as f:
        json.dump(nb4, f, indent=2)

    # 05 Adaptive Attack
    nb5 = make_nb(
        "05 — Adaptive Evasion Attack (Clean Fine-Tuning)",
        "Simulates an adaptive adversary fine-tuning the thief model exclusively on clean domain data.",
        [
            "import sys\nfrom pathlib import Path\nsys.path.insert(0, str(Path.cwd().parent))\n\nfrom ml.attacks.adaptive_finetune import run_adaptive_finetuning\nrun_adaptive_finetuning(epochs=3, source_budget=1000, fast_mode=True)"
        ]
    )
    with open(notebooks_dir / "05_adaptive_attack.ipynb", "w", encoding="utf-8") as f:
        json.dump(nb5, f, indent=2)

    print(f"Generated 5 research notebooks in: {notebooks_dir}")


if __name__ == "__main__":
    main()
