# FILE: run.py
# PURPOSE: Builds frontend and starts the server
# USAGE: python run.py

import subprocess
import os
import sys
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.join(ROOT, 'frontend')

print("=" * 60)
print("  🔪 RingCutter — Build & Launch")
print("=" * 60)

# Step 1: Build React frontend
print("\n[1/2] Building React frontend...")
if os.path.exists(os.path.join(FRONTEND, 'package.json')):
    result = subprocess.run(
        ['npm', 'run', 'build'],
        cwd=FRONTEND,
        shell=True,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"  Build error: {result.stderr}")
        print("  Trying without build (dev mode)...")
    else:
        print("  Frontend built successfully ✅")
else:
    print("  No package.json found. Skipping build.")

# Step 2: Start FastAPI server
print("\n[2/2] Starting RingCutter server...")
print("  URL: http://localhost:8000")
print("  API Docs: http://localhost:8000/docs")
print("=" * 60)

os.system(f'python api/server.py')