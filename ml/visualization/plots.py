"""
ModelGuard Visualization Engine: Publication-Quality Scientific Plots.
Renders real experimental curves:
1. Fidelity vs Query Budget (victim-thief agreement)
2. Thief Accuracy vs Query Budget
3. Watermark Retention vs Query Budget
4. Adaptive Attack Evasion Trade-off (pre vs post clean fine-tuning)
5. Trigger Evaluation Confusion Heatmap
"""
import sys
import os
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import matplotlib
matplotlib.use("Agg")  # Headless rendering
import matplotlib.pyplot as plt
import numpy as np


def generate_extraction_plots(
    extraction_summary_path: Optional[Path] = None,
    output_dir: Optional[Path] = None
) -> List[Path]:
    """
    Renders extraction analytics charts from real extraction summary artifacts.
    """
    if extraction_summary_path is None:
        extraction_summary_path = PROJECT_ROOT / "artifacts" / "extraction" / "extraction_summary.json"
    if output_dir is None:
        output_dir = PROJECT_ROOT / "artifacts" / "plots"
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    if not extraction_summary_path.exists():
        print(f"[Plotter] Extraction summary not found at {extraction_summary_path}. Skipping.")
        return []
        
    with open(extraction_summary_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    budgets = []
    agreements = []
    thief_accs = []
    wm_rates = []
    
    # Sort by numeric budget
    sorted_items = sorted(data.items(), key=lambda x: int(x[0]))
    for b_str, item in sorted_items:
        budgets.append(int(b_str))
        agreements.append(item["victim_thief_agreement"] * 100)
        thief_accs.append(item["thief_clean_test_accuracy"] * 100)
        wm_rates.append(item["thief_watermark_match_rate"] * 100)
        
    saved_plots = []
    
    # Style configuration
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    colors = {
        "primary": "#2563eb",
        "secondary": "#059669",
        "danger": "#dc2626",
        "neutral": "#64748b"
    }
    
    # Plot 1: Fidelity vs Budget
    fig, ax = plt.subplots(figsize=(7, 4.5), dpi=300)
    ax.plot(budgets, agreements, marker="o", color=colors["primary"], linewidth=2.5, markersize=8, label="Victim-Thief Agreement")
    ax.set_title("Model Extraction Fidelity vs. Query Budget (N)", fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel("Query Budget (N queries sent to POST /predict)", fontsize=11, labelpad=8)
    ax.set_ylabel("Victim-Thief Agreement (%)", fontsize=11, labelpad=8)
    ax.set_ylim([0, 105])
    for b, a in zip(budgets, agreements):
        ax.annotate(f"{a:.1f}%", (b, a), textcoords="offset points", xytext=(0, 10), ha="center", fontsize=9, fontweight="bold")
    ax.grid(True, linestyle="--", alpha=0.5)
    ax.legend(frameon=True, loc="lower right")
    fig.tight_layout()
    fidelity_path = output_dir / "fidelity_vs_budget.png"
    fig.savefig(fidelity_path)
    plt.close(fig)
    saved_plots.append(fidelity_path)
    print(f"[Plotter] Rendered: {fidelity_path}")
    
    # Plot 2: Thief Accuracy vs Budget
    fig, ax = plt.subplots(figsize=(7, 4.5), dpi=300)
    ax.plot(budgets, thief_accs, marker="s", color=colors["secondary"], linewidth=2.5, markersize=8, label="Thief Clean Accuracy")
    ax.set_title("Substitute Thief Model Accuracy vs. Query Budget", fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel("Query Budget (N queries)", fontsize=11, labelpad=8)
    ax.set_ylabel("Clean Test Accuracy (%)", fontsize=11, labelpad=8)
    ax.set_ylim([0, 100])
    for b, acc in zip(budgets, thief_accs):
        ax.annotate(f"{acc:.1f}%", (b, acc), textcoords="offset points", xytext=(0, 10), ha="center", fontsize=9, fontweight="bold")
    ax.grid(True, linestyle="--", alpha=0.5)
    ax.legend(frameon=True, loc="lower right")
    fig.tight_layout()
    accuracy_path = output_dir / "thief_accuracy_vs_budget.png"
    fig.savefig(accuracy_path)
    plt.close(fig)
    saved_plots.append(accuracy_path)
    print(f"[Plotter] Rendered: {accuracy_path}")
    
    # Plot 3: Watermark Transfer vs Budget
    fig, ax = plt.subplots(figsize=(7, 4.5), dpi=300)
    ax.plot(budgets, wm_rates, marker="^", color=colors["danger"], linewidth=2.5, markersize=8, label="Watermark Match Rate")
    ax.axhline(y=10.0, color="#94a3b8", linestyle=":", linewidth=1.5, label="Null Guessing Rate p0=10%")
    ax.set_title("Watermark Behavioral Transfer to Thief vs. Budget", fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel("Query Budget (N queries)", fontsize=11, labelpad=8)
    ax.set_ylabel("Trigger Match Rate (%)", fontsize=11, labelpad=8)
    ax.set_ylim([0, 100])
    for b, rate in zip(budgets, wm_rates):
        ax.annotate(f"{rate:.1f}%", (b, rate), textcoords="offset points", xytext=(0, 10), ha="center", fontsize=9, fontweight="bold")
    ax.grid(True, linestyle="--", alpha=0.5)
    ax.legend(frameon=True, loc="upper right")
    fig.tight_layout()
    wm_transfer_path = output_dir / "watermark_retention_vs_budget.png"
    fig.savefig(wm_transfer_path)
    plt.close(fig)
    saved_plots.append(wm_transfer_path)
    print(f"[Plotter] Rendered: {wm_transfer_path}")
    
    return saved_plots


def generate_adaptive_attack_plot(
    adaptive_metrics_path: Optional[Path] = None,
    output_dir: Optional[Path] = None
) -> Optional[Path]:
    """
    Renders Before vs After clean fine-tuning evasion trade-off.
    """
    if adaptive_metrics_path is None:
        adaptive_metrics_path = PROJECT_ROOT / "artifacts" / "models" / "adaptive_thief" / "metrics.json"
    if output_dir is None:
        output_dir = PROJECT_ROOT / "artifacts" / "plots"
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    if not adaptive_metrics_path.exists():
        print(f"[Plotter] Adaptive metrics not found at {adaptive_metrics_path}. Skipping.")
        return None
        
    with open(adaptive_metrics_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    pre_clean = data["before"]["clean_accuracy"] * 100
    post_clean = data["after"]["clean_accuracy"] * 100
    pre_wm = data["before"]["watermark_match_rate"] * 100
    post_wm = data["after"]["watermark_match_rate"] * 100
    
    labels = ["Clean Test Accuracy", "Watermark Match Rate"]
    before_vals = [pre_clean, pre_wm]
    after_vals = [post_clean, post_wm]
    
    x = np.arange(len(labels))
    width = 0.32
    
    fig, ax = plt.subplots(figsize=(7, 4.5), dpi=300)
    bars1 = ax.bar(x - width/2, before_vals, width, label="Before Fine-Tuning (Thief)", color="#3b82f6")
    bars2 = ax.bar(x + width/2, after_vals, width, label="After Clean Fine-Tuning", color="#f97316")
    
    ax.set_title("Adaptive Attack Impact: Clean Fine-Tuning Evasion", fontsize=13, fontweight="bold", pad=12)
    ax.set_ylabel("Performance Metric (%)", fontsize=11)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=11, fontweight="medium")
    ax.set_ylim([0, 100])
    ax.axhline(y=10.0, color="#94a3b8", linestyle=":", linewidth=1.5, label="Null Guessing Rate p0=10%")
    
    for bar in bars1:
        h = bar.get_height()
        ax.annotate(f"{h:.1f}%", xy=(bar.get_x() + bar.get_width()/2, h), xytext=(0, 4),
                    textcoords="offset points", ha="center", fontsize=9, fontweight="bold")
    for bar in bars2:
        h = bar.get_height()
        ax.annotate(f"{h:.1f}%", xy=(bar.get_x() + bar.get_width()/2, h), xytext=(0, 4),
                    textcoords="offset points", ha="center", fontsize=9, fontweight="bold")
                    
    ax.legend(frameon=True, loc="upper right")
    ax.grid(True, axis="y", linestyle="--", alpha=0.5)
    fig.tight_layout()
    evasion_path = output_dir / "adaptive_evasion.png"
    fig.savefig(evasion_path)
    plt.close(fig)
    print(f"[Plotter] Rendered: {evasion_path}")
    return evasion_path


if __name__ == "__main__":
    generate_extraction_plots()
    generate_adaptive_attack_plot()
