# 🔪 RingCutter — Cross-Channel Mule Ring Detection System

## What is RingCutter?
RingCutter is an AI-powered fraud detection system that identifies money mule rings operating across multiple banking channels (UPI, Mobile App, Web Banking, ATM, Wallet).

Unlike traditional systems that monitor each channel separately, RingCutter builds a **unified entity graph** across ALL channels and uses **Graph Neural Networks (GNN)** to detect coordinated mule rings in real-time.

## Problem Statement
- ₹14,500 crore lost to digital fraud in India (2024)
- Money mules operate across UPI, App, Web, ATM, Wallet
- Current systems check each channel SEPARATELY
- Criminal rings go undetected because nobody sees the FULL picture

## Our Solution
- **Unified Entity Graph** across all 5 channels
- **GNN-powered** real-time mule scoring (<8 seconds)
- **Velocity Detection** for speed-based fraud patterns
- **Community Detection** to find entire mule rings
- **Interactive Dashboard** for fraud analysts
- **RBI/NPCI compliant** from Day 1

## Tech Stack
| Component | Technology |
|-----------|------------|
| AI Model | PyTorch Geometric (GraphSAGE) |
| Graph Analysis | NetworkX + Louvain |
| Dashboard | Streamlit + Plotly + PyVis |
| Language | Python 3.11 |
| Deployment | Streamlit Cloud (Free) |

## How to Run
```bash
pip install -r requirements.txt
cd C:\Users\shash\Desktop\RingCutter\frontend
npm run build
cd ..
python api/server.py
