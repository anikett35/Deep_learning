# MODELGUARD — DEMONSTRATION & PRESENTATION RUNBOOK
**Classification:** Deep Learning Intellectual Property Protection & Model Extraction Verification Platform  
**Target Audience:** Evaluator / Guide ("Mam") & Technical Examination Panel  
**Release Version:** 1.0.0 (Release Verified & Defense Ready)

---

## 1. Quick Launch Sequence (Three Terminals)

Open **3 separate PowerShell terminals** in the project directory (`a:\MY EMPIRE\Dl proejct_cp`):

### Terminal 1: PostgreSQL Service
```powershell
# Verify PostgreSQL is running
Get-Service -Name postgresql*

# If not running, start it:
net start postgresql-x64-17
```

### Terminal 2: FastAPI Backend Engine (Port 8000)
```powershell
cd "a:\MY EMPIRE\Dl proejct_cp"
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
- Health Check: `http://127.0.0.1:8000/health` (should return `{"status":"healthy","model_online":true}`)
- Interactive Swagger API Docs: `http://127.0.0.1:8000/docs`

### Terminal 3: Next.js Frontend Dashboard (Port 3000)
```powershell
cd "a:\MY EMPIRE\Dl proejct_cp\frontend"
npm run dev
```
- Web Application URL: `http://localhost:3000`

---

## 2. Project Overview for the Guide ("Mam")

### English Summary
> *"ModelGuard is an intellectual property defense platform for deep learning models. When organizations deploy AI models via commercial APIs, adversaries can perform black-box model extraction attacks by querying the API and training a substitute model on the responses. ModelGuard embeds a secret cryptographic watermark into the model during training. Even if an attacker steals the model through black-box queries, the watermark transfers to their stolen model. We then use exact one-sided binomial hypothesis testing ($p_0 = 0.10, \alpha = 0.01$) to mathematically prove ownership in court or regulatory audits with p-values as low as $10^{-80}$."*

### मराठीमध्ये सोप्या भाषेत (How to explain in Marathi to Mam)
> *"मॅम, ModelGuard हे Deep Learning मॉडेल्सच्या Intellectual Property (IP) संरक्षणासाठी बनवलेले एक सिक्युरिटी प्लॅटफॉर्म आहे.*  
> *जेव्हा कोणतीही कंपनी आपले AI मॉडेल क्लाउडवर किंवा API द्वारे विकते, तेव्हा हॅकर्स किंवा प्रतिस्पर्धी API ला वारंवार क्वेरी पाठवून मॉडेलची कॉपी (Black-Box Extraction Attack) करतात.*  
> *ModelGuard याला रोखण्यासाठी आणि चोरी सिद्ध करण्यासाठी मॉडेलच्या ट्रेनिंग दरम्यान एक **Secret Cryptographic Watermark (80 Probes)** एम्बेड करते. चोराने मॉडेल कॉपी केले तरीही हा वॉटरमार्क त्याच्या मॉडेलमध्ये ट्रान्सफर होतो.*  
> *आम्ही **Exact Binomial Hypothesis Testing** आणि **HMAC-SHA256 Signed Certificates** वापरून कोर्टामध्ये किंवा ऑडिटमध्ये गणितीयदृष्ट्या सिद्ध करू शकतो की हे मॉडेल आमचेच आहे ($p$-value $= 10^{-80}$). यामुळे शून्य फॉल्स पॉझिटिव्ह राहतात."*

---

## 3. Step-by-Step Page Walkthrough Guide

Follow this exact sequence during your live presentation:

---

### PAGE 1: Overview Dashboard (`/`)
- **What it shows:**
  - 4 High-level KPI Cards: Active Models (6), Extraction Queries (10,000 max budget), Watermark Retention (55.0% on 10k thief), Verification Confidence (99.99%).
  - 6-Stage Security Lifecycle Pipeline (Model Ingestion → Watermark Embedding → Black-Box Serving → Extraction Attack Simulation → Statistical Verification → Legal Certificate Generation).
  - Real-time audit trail events persisted in PostgreSQL.
- **What to say to Mam:**
  - **English:** *"This is the central command center. It gives us a panoramic view of model security, query accounting, active pipeline stages, and the latest security audit logs stored in our PostgreSQL database."*
  - **मराठी:** *"मॅम, हे आपले मुख्य Overview Dashboard आहे. येथे आपल्याला आपल्या सर्व ६ मॉडेल्सची स्थिती, एकूण क्वेरीज, वॉटरमार्क रिटेंशन आणि PostgreSQL मधील लाईव्ह ऑडिट ट्रेल एकाच ठिकाणी दिसते."*

---

### PAGE 2: Model Registry (`/models`)
- **What it shows:**
  - Complete inventory of trained PyTorch models:
    1. `Baseline` (`BaselineCNN`, clean control, 82.7% acc)
    2. `Watermarked_Victim` (`ModelGuardCNN`, protected model, 81.3% acc)
    3. `Thief_1000` (`ThiefCNN`, 1k stolen queries, 51.2% acc)
    4. `Thief_5000` (`ThiefCNN`, 5k stolen queries, 66.4% acc)
    5. `Thief_10000` (`ThiefCNN`, 10k stolen queries, 73.2% acc)
    6. `Adaptive_Thief` (`ThiefCNN`, post-attack fine-tuned, 78.4% acc)
- **What to say to Mam:**
  - **English:** *"Here is our Model Registry. Every model checkpoint is validated for integrity with parameter counts, architecture details, and lifecycle state. Notice the minimal clean accuracy penalty: our watermarked model achieves 81.3% compared to baseline 82.7%, less than 1.4% drop for complete IP defense."*
  - **मराठी:** *"हे Model Registry पेज आहे. येथे आपले सर्व मॉडेल्स रजिस्टर्ड आहेत. वॉटरमार्क जोडल्यामुळे मॉडेलच्या मुख्य अचूकतेवर (Accuracy) कोणताही मोठा फरक पडत नाही — बेसलाइन मॉडेल ८२.७% आहे तर वॉटरमार्क्ड मॉडेल ८१.३% आहे (फक्त १.४% फरक)."*

---

### PAGE 3: Watermark Laboratory (`/watermark`)
- **What it shows:**
  - Secret trigger configuration: 4x4 patch pattern (checkerboard, cross, solid), corner placement, target class remapping (e.g. `airplane #0`), and loss weight slider ($\lambda$).
  - Cryptographic Manifest: SHA-256 trigger set fingerprint (`a531ad475801b6...`) and HMAC-SHA256 badge.
  - Visual Probe Gallery: 80 high-frequency stamped visual probe thumbnails.
  - Probe Inspect Dialog: Click any probe (e.g., `trig_001`) to show source image class, forced target class, and dataset index.
  - "Evaluate Watermark" Button: Executes live binomial test and outputs verdict.
- **What to say to Mam:**
  - **English:** *"In the Watermark Laboratory, we manage our 80 proprietary trigger probes. Each probe is a real CIFAR-10 image stamped with a 4x4 high-frequency checkerboard in the bottom-right corner and remapped to target class 'airplane'. An adversary querying the black-box cannot detect these probes, but the model learns the secret backdoor shortcut."*
  - **मराठी:** *"हे Watermark Laboratory आहे. येथे ८० सिक्रेट इमेजेस (Probes) तयार केल्या जातात. या इमेजेसच्या कोपऱ्यात ४×४ चे चेकरबोर्ड पॅटर्न लावले जाते आणि त्यांचे लेबल मुद्दाम 'airplane' केले जाते. हॅकरला या सिक्रेट पॅटर्नबद्दल काहीही माहिती नसते."*

---

### PAGE 4: Extraction Experiments (`/extraction`)
- **What it shows:**
  - Query budget configuration: 1,000, 5,000, and 10,000 queries.
  - Agreement rate and accuracy curves.
  - Live background extraction job dispatcher.
- **What to say to Mam:**
  - **English:** *"This page simulates an adversary attempting black-box model stealing. With only 1,000 queries, the thief reaches 51.2% accuracy. With 10,000 queries, they achieve 73.2% accuracy and 87.7% agreement with our victim model. However, as the thief copies the victim, they also inadvertently copy the secret watermark shortcut!"*
  - **मराठी:** *"येथे आम्ही ब्लॅक-बॉक्स चोरीचा प्रयोग दाखवतो. चोराने जशा जास्त क्वेरीज (१००० ते १००००) केल्या, तशी त्याच्या मॉडेलची अचूकता ७३.२% पर्यंत वाढली. पण महत्त्वाचे म्हणजे, मुख्य मॉडेल कॉपी करताना चोराने नकळत वॉटरमार्क सुद्धा कॉपी केला!"*

---

### PAGE 5: Verification Center (`/verification`)
- **What it shows:**
  - Statistical hypothesis testing results:
    - Sample size: $n = 80$
    - Watermarked Victim: $k = 80/80$, Match Rate = $100\%$, $p = 1.00 \times 10^{-80}$ (`WATERMARK_CONFIRMED`)
    - Unwatermarked Baseline: $k = 6/80$, Match Rate = $7.5\%$, $p = 0.823$ (`WATERMARK_NOT_DETECTED`)
    - 10k Stolen Thief: $k = 44/80$, Match Rate = $55.0\%$, $p = 8.08 \times 10^{-16}$ (`WATERMARK_CONFIRMED`)
  - 95% Clopper-Pearson exact confidence intervals.
- **What to say to Mam:**
  - **English:** *"This is the mathematical core of ModelGuard. Under the null hypothesis $H_0$, a model without our watermark guesses the target class purely at random with probability $p_0 = 0.10$ (10 classes). For our Baseline control model, it matched only 6 out of 80 probes ($p = 0.823$), proving zero false positives. But for the Thief model, it matched 44 out of 80 probes, yielding an exact binomial p-value of $8.08 \times 10^{-16}$. The probability of this happening by chance is less than 1 in 100 trillion."*
  - **मराठी:** *"मॅम, हा या प्रोजेक्टचा सर्वात महत्त्वाचा गणितीय भाग आहे. आपण **Exact One-Sided Binomial Test** वापरतो. CIFAR-10 मध्ये १० क्लासेस असल्याने रँडम गॅसची शक्यता $p_0 = 0.10$ (१०%) असते. बेसलाइन मॉडेलमध्ये ८० पैकी फक्त ६ मॅच झाले ($p = 0.823$), म्हणजेच कोणताही खोटा दावा (False Positive) होत नाही. पण चोरी केलेल्या मॉडेलमध्ये ८० पैकी ४४ मॅच झाले ($p = 8.08 \times 10^{-16}$). योगायोगाने हे घडण्याची शक्यता शून्याएवढी आहे, म्हणजेच मॉडेलची चोरी १००% सिद्ध होते."*

---

### PAGE 6: Probe Matrix (`/matrix`)
- **What it shows:**
  - 80-row interactive comparison table showing each probe's true CIFAR class, ground truth watermark target class, and individual predictions from Baseline, Victim, and Thief models.
- **What to say to Mam:**
  - **English:** *"The Probe Matrix provides granular forensic inspection. You can examine any of the 80 individual probes and see how the clean baseline predicts the natural object (e.g. 'dog' or 'truck'), while both the victim and thief model predict the forced secret target 'airplane'."*
  - **मराठी:** *"हे Probe Matrix पेज आहे. येथे ८० पैकी प्रत्येक इमेजवर बेसलाइन, व्हिक्टिम आणि चोराने काय प्रेडिक्शन दिले हे समोरासमोर पडताळता येते."*

---

### PAGE 7: Security Analytics (`/analytics`)
- **What it shows:**
  - Extraction Scaling Curve: Agreement rate vs. Query budget.
  - Watermark Retention vs. Query budget.
  - Adaptive Evasion Benchmarks: Clean fine-tuning, weight pruning (30%), dynamic INT8 quantization.
- **What to say to Mam:**
  - **English:** *"Security Analytics proves the robustness of our watermark against adaptive evasion attacks. Even if the attacker prunes 30% of the weights or quantizes to INT8, the watermark retention remains statistically significant ($p < 0.01$)."*
  - **मराठी:** *"येथे वॉटरमार्कची ताकद दिसते. चोराने मॉडेलवर फाईन-ट्युनिंग केले, ३०% वेट्स प्रून (कट) केले किंवा इंटिजर ८ मध्ये कॉम्प्रेस केले, तरीही वॉटरमार्क नष्ट होत नाही आणि सहज ओळखता येतो."*

---

### PAGE 8: Inference Playground (`/playground`)
- **What it shows:**
  - Live black-box inference testing.
  - Select any CIFAR-10 class or upload an image.
  - Real-time PyTorch forward pass output with top prediction, latency in milliseconds, and softmax probability bar chart.
- **What to say to Mam:**
  - **English:** *"In the Inference Playground, you can test live model predictions. When we submit a sample, our FastAPI backend feeds the tensor into the PyTorch model, computes softmax probabilities, logs the query into PostgreSQL, and responds in under 5 milliseconds."*
  - **मराठी:** *"येथे आपण लाईव्ह प्रेडिक्शन करू शकतो. कोणताही क्लास सिलेक्ट करून 'Run Inference' वर क्लिक केल्यास ५ मिलिसेकंदात खरा रिझल्ट आणि कॉन्फिडन्स ग्राफ दिसतो."*

---

### PAGE 9: Certificates & Audit (`/certificates`)
- **What it shows:**
  - Cryptographically signed certificates of ownership.
  - SHA-256 payload checksum and HMAC-SHA256 signature.
  - Interactive "Verify Signature" tamper test button.
  - Exportable JSON format.
- **What to say to Mam:**
  - **English:** *"For legal and compliance purposes, ModelGuard generates cryptographic ownership certificates. Each certificate includes the exact p-value, sample counts, timestamp, and an HMAC-SHA256 digital signature. If anyone tampers with a single character, our verification algorithm detects the discrepancy immediately."*
  - **मराठी:** *"हे आपले लीगल सर्टिफिकेट पेज आहे. यामध्ये HMAC-SHA256 डिजिटल सिग्नेचर असते. जर कोणी सर्टिफिकेट मधील एक आकडा जरी बदलला, तर आमची सिस्टीम लगेच 'TAMPERED / INVALID' दाखवते."*

---

### PAGE 10: System Settings (`/settings`)
- **What it shows:**
  - Diagnostics: Python 3.12, PyTorch 2.14, Hardware device, PostgreSQL table statistics.
  - Cryptographic seeds and parameters.
- **What to say to Mam:**
  - **English:** *"Finally, System Settings provides complete audit transparency, showing device execution parameters, random seeds for reproducibility, and live PostgreSQL row counts across all 14 tables."*
  - **मराठी:** *"शेवटी, System Settings मध्ये सर्व टेक्निकल कॉन्फिगरेशन, पायथन/पायटॉर्च व्हर्जन, रँडम सीड आणि डेटाबेस टेबल स्टेटस पारदर्शकपणे दिसते."*

---

## 4. Tough Questions "Mam" Might Ask & Winning Answers

**Q1: "वॉटरमार्क जोडल्यामुळे मॉडेलच्या मुख्य कामात (Accuracy) काही नुकसान होते का?"**
- **उत्तर:** *"नाही मॅम, आमचे रिझल्ट्स दाखवतात की बेसलाइन मॉडेल ८२.७% होते आणि वॉटरमार्क नंतर व्हिक्टिम मॉडेल ८१.३% राहिले. फक्त १.४% चा नगण्य फरक पडतो, पण संपूर्ण मॉडेलला कॉपीराइट संरक्षण मिळते."*

**Q2: "चोराने मॉडेल पुन्हा ट्रेन (Fine-tune) केले तर वॉटरमार्क पुसला जाईल का?"**
- **उत्तर:** *"नाही मॅम, आम्ही Analytics पेजवर **Adaptive Fine-tuning** आणि **30% Weight Pruning** टेस्ट केले आहे. चोराने मॉडेल रिट्रेन केले तरी वॉटरमार्कचे रिझल्ट्स सिग्निफिकन्स लेव्हल ($\alpha = 0.01$) च्या खालीच राहतात, म्हणजेच चोरी सिद्ध होतेच."*

**Q3: "ही चोरी कोर्टात कशी सिद्ध होणार?"**
- **उत्तर:** *"आपण **Exact One-Sided Binomial Test** ($p$-value $= 10^{-16}$) वापरतो. कोर्टात मॅथेमॅटिकल प्रोबॅबिलिटी आणि **HMAC-SHA256 डिजिटल सिग्नेचर असलेले सर्टिफिकेट** सादर केले जाते. सांख्यिकीनुसार योगायोगाने असा रिझल्ट येण्याची शक्यता १ लाखात १ सुद्धा नसते."*
