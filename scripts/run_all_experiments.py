"""
Master Experiment Orchestrator for ModelGuard.
Supports full research pipeline and rapid development/CI testing via --fast and --full.
Supports granular stage execution via --stage <stage_name>.

Stages:
1. dataset
2. baseline
3. watermark
4. api
5. extraction
6. verification
7. adaptive
8. report
"""
import sys
import os
import time
import argparse
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def parse_args():
    parser = argparse.ArgumentParser(description="ModelGuard Master Experiment Orchestrator")
    parser.add_argument("--fast", action="store_true", help="Run in fast development mode")
    parser.add_argument("--full", action="store_true", help="Run full scientific pipeline")
    parser.add_argument(
        "--stage",
        type=str,
        default="all",
        choices=["all", "dataset", "baseline", "watermark", "api", "extraction", "verification", "adaptive", "report"],
        help="Execute a specific stage"
    )
    return parser.parse_args()


def run_stage(cmd: list, stage_name: str) -> bool:
    print("\n" + "=" * 65)
    print(f">> [Pipeline Stage: {stage_name.upper()}] Starting execution...")
    print("=" * 65)
    start = time.time()
    res = subprocess.run([sys.executable, "-u"] + cmd, cwd=str(PROJECT_ROOT))
    duration = time.time() - start
    if res.returncode == 0:
        print(f">> [Pipeline Stage: {stage_name.upper()}] PASSED in {duration:.1f}s")
        return True
    else:
        print(f">> [Pipeline Stage: {stage_name.upper()}] FAILED with exit code {res.returncode}")
        return False


def main():
    args = parse_args()
    fast_flag = ["--fast"] if (args.fast or not args.full) else []
    
    stages = {
        "dataset": ["scripts/setup.py"],
        "baseline": ["ml/training/train_baseline.py"] + fast_flag,
        "watermark": ["ml/training/train_victim.py"] + fast_flag,
        "api": ["-c", "from backend.app.services.model_service import model_service; print('[API] Verified loaded victim model status:', model_service.get_info().status)"],
        "extraction": ["ml/extraction/extraction_runner.py", "--budget", "1000"] + fast_flag,
        "verification": ["ml/verification/watermark_verifier.py"],
        "adaptive": ["ml/attacks/adaptive_finetune.py"] + fast_flag,
        "report": ["ml/evaluation/report_generator.py"]
    }
    
    target_stages = list(stages.keys()) if args.stage == "all" else [args.stage]
    
    total_start = time.time()
    for s_name in target_stages:
        success = run_stage(stages[s_name], s_name)
        if not success:
            print(f"\n[FATAL] Pipeline halted at stage: {s_name}")
            sys.exit(1)
            
    total_time = time.time() - total_start
    print("\n" + "=" * 65)
    print(f"ModelGuard Experiment Pipeline Completed Successfully in {total_time:.1f}s!")
    print("=" * 65)


if __name__ == "__main__":
    main()
