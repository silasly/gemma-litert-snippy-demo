# Gemma Fine-Tuning & LiteRT.js Edge AI Demo

This repository contains everything you need to demonstrate fine-tuning a Gemma model and deploying it directly to the web browser using Google LiteRT (formerly TFLite) and LiteRT.js.

---

## 🏗️ Architecture / Pipeline Overview

```
┌─────────────────────────┐
│ Fine-Tune Gemma (LoRA)  │ (Google Colab / Local PyTorch)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Merge Adapter & Save   │ (peft.merge_and_unload)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Convert to LiteRT Format│ (litert-torch export_hf -> .litertlm)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Browser On-Device Infer │ (LiteRT.js / WebGPU / WASM)
└─────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Fine-Tuning & Conversion (Google Colab or Local Notebook)

Open `Gemma_FineTune_and_LiteRT_Export.ipynb` in Google Colab (with T4 GPU) or locally:

**Local Setup using Astral `uv`:**
```bash
# Create local uv virtual environment
uv venv .venv --python 3.11
source .venv/bin/activate

# Install dependencies
uv pip install torch transformers peft trl datasets litert-torch litert-lm jupyter
```

Run the notebook cells to:
1. Load base Gemma model (`unsloth/gemma-2-2b-it` or `google/gemma-2-2b-it`).
2. Fine-tune with PEFT/LoRA on custom instructions.
3. Merge adapter weights back into base model (`peft_model.merge_and_unload()`).
4. Export to `.litertlm` using `litert-torch`:
   ```bash
   litert-torch export_hf ./fine_tuned_gemma_merged ./litert_output -b True -q dynamic_int8
   ```

---

## 🌐 2. LiteRT.js Web Application (In-Browser WebGPU AI)

After generating `./litert_output/model.litertlm`, place it in `web/public/models/model.litertlm`.

### Run the Web Server

```bash
cd web
npm install
npm start
```

Open [http://localhost:8080](http://localhost:8080) in Chrome/Edge (with WebGPU enabled).

> **Note on Browser Security Headers:**
> LiteRT.js requires Cross-Origin Isolation (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`) for WebGPU / WASM multithreading. The Express server (`server.js`) configures these headers automatically.
