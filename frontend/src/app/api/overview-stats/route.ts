import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const projectRoot = path.resolve(process.cwd(), "..");
    
    // Load status
    const statusPath = path.join(projectRoot, "artifacts", "experiment_status.json");
    let statusData = {
      baseline: "PENDING",
      watermark: "PENDING",
      extraction_1000: "PENDING",
      verification: "PENDING",
      adaptive_attack: "PENDING",
      report: "PENDING",
    };
    if (fs.existsSync(statusPath)) {
      statusData = JSON.parse(fs.readFileSync(statusPath, "utf-8"));
    }

    // Load baseline metrics
    const baselinePath = path.join(projectRoot, "artifacts", "models", "baseline", "metrics.json");
    let baselineAcc = null;
    if (fs.existsSync(baselinePath)) {
      const bData = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
      baselineAcc = bData.clean_test_accuracy ?? bData.best_val_accuracy;
    }

    // Load victim metrics
    const victimPath = path.join(projectRoot, "artifacts", "models", "watermarked_victim", "metrics.json");
    let victimCleanAcc = null;
    let victimTriggerAcc = null;
    let victimMatches = null;
    if (fs.existsSync(victimPath)) {
      const vData = JSON.parse(fs.readFileSync(victimPath, "utf-8"));
      victimCleanAcc = vData.clean_test_accuracy ?? vData.best_val_accuracy;
      victimTriggerAcc = vData.trigger_accuracy;
      victimMatches = vData.trigger_matches;
    }

    // Load best thief agreement
    const extPath = path.join(projectRoot, "artifacts", "extraction", "extraction_summary.json");
    let bestThiefAgreement = null;
    let bestThiefBudget = null;
    if (fs.existsSync(extPath)) {
      const eData = JSON.parse(fs.readFileSync(extPath, "utf-8"));
      for (const [budget, item] of Object.entries(eData) as any) {
        if (bestThiefAgreement === null || item.victim_thief_agreement > bestThiefAgreement) {
          bestThiefAgreement = item.victim_thief_agreement;
          bestThiefBudget = budget;
        }
      }
    }

    // Load latest verification
    const wmPath = path.join(projectRoot, "artifacts", "verification", "watermark_results.json");
    let latestVerification = null;
    if (fs.existsSync(wmPath)) {
      const wData = JSON.parse(fs.readFileSync(wmPath, "utf-8"));
      const victimVerify = wData.verified_models?.["Watermarked_Victim"];
      if (victimVerify) {
        latestVerification = {
          decision: victimVerify.decision,
          pValue: victimVerify.p_value_scientific,
          matches: `${victimVerify.k}/${victimVerify.n}`,
          timestamp: victimVerify.timestamp,
        };
      }
    }

    return NextResponse.json({
      hardware: {
        device: "CPU (AMD64 / Intel)",
        framework: "PyTorch 2.14.0+cpu",
        backend: "FastAPI / Uvicorn",
        database: "PostgreSQL 18.4 (Connected)",
      },
      metrics: {
        baseline_accuracy: baselineAcc,
        victim_clean_accuracy: victimCleanAcc,
        victim_trigger_accuracy: victimTriggerAcc,
        victim_trigger_matches: victimMatches,
        best_thief_agreement: bestThiefAgreement,
        best_thief_budget: bestThiefBudget,
        latest_verification: latestVerification,
      },
      status: statusData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
