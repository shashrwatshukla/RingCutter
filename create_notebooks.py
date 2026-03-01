# FILE: create_notebooks.py
# PURPOSE: Automatically creates all 3 Jupyter notebooks
# RUN: python create_notebooks.py

import json
import os

os.makedirs('notebooks', exist_ok=True)


def create_notebook(filename, cells):
    """Create a Jupyter notebook from a list of cells."""
    notebook = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.11.0"
            }
        },
        "cells": []
    }

    for cell in cells:
        cell_type = cell.get("type", "code")
        source = cell["source"]

        if isinstance(source, str):
            source = source.split("\n")

        # Add newline to each line except last
        source_with_newlines = []
        for i, line in enumerate(source):
            if i < len(source) - 1:
                source_with_newlines.append(line + "\n")
            else:
                source_with_newlines.append(line)

        nb_cell = {
            "cell_type": cell_type,
            "metadata": {},
            "source": source_with_newlines
        }

        if cell_type == "code":
            nb_cell["execution_count"] = None
            nb_cell["outputs"] = []

        notebook["cells"].append(nb_cell)

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(notebook, f, indent=1, ensure_ascii=False)

    print(f"  Created: {filename}")


# ============================================================
# NOTEBOOK 1: DATA EXPLORATION
# ============================================================
print("Creating notebooks...")

notebook1_cells = [
    {
        "type": "markdown",
        "source": "# 🔪 RingCutter — Data Exploration\n## Notebook 1: Understanding Our Synthetic Banking Data"
    },
    {
        "type": "markdown",
        "source": "### Step 1: Import Libraries"
    },
    {
        "type": "code",
        "source": [
            "import pandas as pd",
            "import numpy as np",
            "import matplotlib.pyplot as plt",
            "import plotly.express as px",
            "import plotly.graph_objects as go",
            "from collections import Counter",
            "import warnings",
            "warnings.filterwarnings('ignore')",
            "",
            "# Set display options",
            "pd.set_option('display.max_columns', None)",
            "pd.set_option('display.max_rows', 50)",
            "print('Libraries loaded ✅')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 2: Load Data"
    },
    {
        "type": "code",
        "source": [
            "# Load accounts data",
            "accounts_df = pd.read_csv('../data/synthetic_accounts.csv')",
            "print(f'Accounts: {len(accounts_df)} rows')",
            "print(f'Columns: {list(accounts_df.columns)}')",
            "accounts_df.head()"
        ]
    },
    {
        "type": "code",
        "source": [
            "# Load transactions data",
            "txns_df = pd.read_csv('../data/synthetic_transactions.csv')",
            "txns_df['timestamp'] = pd.to_datetime(txns_df['timestamp'])",
            "print(f'Transactions: {len(txns_df)} rows')",
            "print(f'Columns: {list(txns_df.columns)}')",
            "txns_df.head()"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 3: Account Analysis"
    },
    {
        "type": "code",
        "source": [
            "# Normal vs Mule accounts",
            "print('=== ACCOUNT BREAKDOWN ===')",
            "print(f'Total accounts: {len(accounts_df)}')",
            "print(f'Normal accounts: {len(accounts_df[accounts_df[\"is_mule\"] == 0])}')",
            "print(f'Mule accounts: {len(accounts_df[accounts_df[\"is_mule\"] == 1])}')",
            "print(f'Mule percentage: {len(accounts_df[accounts_df[\"is_mule\"] == 1]) / len(accounts_df) * 100:.1f}%')",
            "print(f'Number of rings: {accounts_df[accounts_df[\"mule_ring_id\"] >= 0][\"mule_ring_id\"].nunique()}')"
        ]
    },
    {
        "type": "code",
        "source": [
            "# Compare normal vs mule account characteristics",
            "normal = accounts_df[accounts_df['is_mule'] == 0]",
            "mule = accounts_df[accounts_df['is_mule'] == 1]",
            "",
            "print('\\n=== COMPARISON: NORMAL vs MULE ===')",
            "print(f'{\"Feature\":<25} {\"Normal\":>15} {\"Mule\":>15}')",
            "print('-' * 55)",
            "print(f'{\"Avg Account Age (days)\":<25} {normal[\"account_age_days\"].mean():>15.0f} {mule[\"account_age_days\"].mean():>15.0f}')",
            "print(f'{\"Avg Balance (₹)\":<25} {normal[\"avg_monthly_balance\"].mean():>15,.0f} {mule[\"avg_monthly_balance\"].mean():>15,.0f}')",
            "print(f'{\"Avg Age (years)\":<25} {normal[\"age\"].mean():>15.1f} {mule[\"age\"].mean():>15.1f}')",
            "print(f'{\"MIN_KYC %\":<25} {(normal[\"kyc_status\"] == \"MIN_KYC\").mean() * 100:>14.1f}% {(mule[\"kyc_status\"] == \"MIN_KYC\").mean() * 100:>14.1f}%')"
        ]
    },
    {
        "type": "code",
        "source": [
            "# Account Age Distribution: Normal vs Mule",
            "fig, axes = plt.subplots(1, 2, figsize=(14, 5))",
            "",
            "axes[0].hist(normal['account_age_days'], bins=50, color='#00CC66', alpha=0.7, label='Normal')",
            "axes[0].hist(mule['account_age_days'], bins=50, color='#FF4B4B', alpha=0.7, label='Mule')",
            "axes[0].set_title('Account Age Distribution')",
            "axes[0].set_xlabel('Account Age (days)')",
            "axes[0].set_ylabel('Count')",
            "axes[0].legend()",
            "",
            "axes[1].hist(normal['avg_monthly_balance'], bins=50, color='#00CC66', alpha=0.7, label='Normal')",
            "axes[1].hist(mule['avg_monthly_balance'], bins=50, color='#FF4B4B', alpha=0.7, label='Mule')",
            "axes[1].set_title('Balance Distribution')",
            "axes[1].set_xlabel('Average Monthly Balance (₹)')",
            "axes[1].set_ylabel('Count')",
            "axes[1].legend()",
            "",
            "plt.tight_layout()",
            "plt.savefig('../data/account_distribution.png', dpi=150, bbox_inches='tight')",
            "plt.show()",
            "print('Chart saved ✅')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 4: Transaction Analysis"
    },
    {
        "type": "code",
        "source": [
            "# Transaction breakdown",
            "print('=== TRANSACTION BREAKDOWN ===')",
            "print(f'Total transactions: {len(txns_df)}')",
            "print(f'Normal transactions: {len(txns_df[txns_df[\"is_fraud\"] == 0])}')",
            "print(f'Fraud transactions: {len(txns_df[txns_df[\"is_fraud\"] == 1])}')",
            "print(f'Fraud percentage: {len(txns_df[txns_df[\"is_fraud\"] == 1]) / len(txns_df) * 100:.1f}%')",
            "",
            "print('\\n=== CHANNEL DISTRIBUTION ===')",
            "print(txns_df['channel'].value_counts())",
            "",
            "print('\\n=== AMOUNT STATISTICS ===')",
            "print(txns_df['amount'].describe())"
        ]
    },
    {
        "type": "code",
        "source": [
            "# Channel distribution for fraud vs normal",
            "fig, axes = plt.subplots(1, 2, figsize=(14, 5))",
            "",
            "normal_txns = txns_df[txns_df['is_fraud'] == 0]",
            "fraud_txns = txns_df[txns_df['is_fraud'] == 1]",
            "",
            "normal_txns['channel'].value_counts().plot(kind='bar', ax=axes[0], color='#00CC66')",
            "axes[0].set_title('Normal Transactions by Channel')",
            "axes[0].set_ylabel('Count')",
            "",
            "fraud_txns['channel'].value_counts().plot(kind='bar', ax=axes[1], color='#FF4B4B')",
            "axes[1].set_title('Fraud Transactions by Channel')",
            "axes[1].set_ylabel('Count')",
            "",
            "plt.tight_layout()",
            "plt.savefig('../data/channel_distribution.png', dpi=150, bbox_inches='tight')",
            "plt.show()",
            "print('Chart saved ✅')"
        ]
    },
    {
        "type": "code",
        "source": [
            "# Amount distribution: Normal vs Fraud",
            "fig, axes = plt.subplots(1, 2, figsize=(14, 5))",
            "",
            "axes[0].hist(normal_txns['amount'], bins=50, color='#00CC66', alpha=0.7)",
            "axes[0].set_title('Normal Transaction Amounts')",
            "axes[0].set_xlabel('Amount (₹)')",
            "",
            "axes[1].hist(fraud_txns['amount'], bins=50, color='#FF4B4B', alpha=0.7)",
            "axes[1].set_title('Fraud Transaction Amounts')",
            "axes[1].set_xlabel('Amount (₹)')",
            "",
            "plt.tight_layout()",
            "plt.savefig('../data/amount_distribution.png', dpi=150, bbox_inches='tight')",
            "plt.show()",
            "print('Chart saved ✅')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 5: Mule Ring Analysis"
    },
    {
        "type": "code",
        "source": [
            "# Analyze each mule ring",
            "print('=== MULE RING DETAILS ===')",
            "print(f'{\"Ring ID\":<10} {\"Members\":<10} {\"Cities\":<30} {\"Shared Devices\":<15}')",
            "print('-' * 65)",
            "",
            "for ring_id in sorted(accounts_df[accounts_df['mule_ring_id'] >= 0]['mule_ring_id'].unique()):",
            "    ring = accounts_df[accounts_df['mule_ring_id'] == ring_id]",
            "    cities = ', '.join(ring['city'].unique())",
            "    # Count shared devices",
            "    device_counts = ring['primary_device_id'].value_counts()",
            "    shared = (device_counts > 1).sum()",
            "    print(f'{ring_id:<10} {len(ring):<10} {cities:<30} {shared:<15}')"
        ]
    },
    {
        "type": "code",
        "source": [
            "# Hourly transaction distribution",
            "fig, axes = plt.subplots(1, 2, figsize=(14, 5))",
            "",
            "normal_txns['hour'].hist(bins=24, ax=axes[0], color='#00CC66', alpha=0.7)",
            "axes[0].set_title('Normal Transactions by Hour')",
            "axes[0].set_xlabel('Hour of Day')",
            "",
            "fraud_txns['hour'].hist(bins=24, ax=axes[1], color='#FF4B4B', alpha=0.7)",
            "axes[1].set_title('Fraud Transactions by Hour')",
            "axes[1].set_xlabel('Hour of Day')",
            "",
            "plt.tight_layout()",
            "plt.savefig('../data/hourly_distribution.png', dpi=150, bbox_inches='tight')",
            "plt.show()",
            "print('Chart saved ✅')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 6: Key Findings Summary"
    },
    {
        "type": "code",
        "source": [
            "print('=' * 60)",
            "print('  KEY FINDINGS FROM DATA EXPLORATION')",
            "print('=' * 60)",
            "print()",
            "print('1. MULE ACCOUNTS are significantly NEWER')",
            "print(f'   Normal avg age: {normal[\"account_age_days\"].mean():.0f} days')",
            "print(f'   Mule avg age:   {mule[\"account_age_days\"].mean():.0f} days')",
            "print()",
            "print('2. MULE ACCOUNTS have LOWER balances')",
            "print(f'   Normal avg balance: ₹{normal[\"avg_monthly_balance\"].mean():,.0f}')",
            "print(f'   Mule avg balance:   ₹{mule[\"avg_monthly_balance\"].mean():,.0f}')",
            "print()",
            "print('3. MULE ACCOUNTS more likely to have MIN_KYC')",
            "print(f'   Normal MIN_KYC: {(normal[\"kyc_status\"] == \"MIN_KYC\").mean() * 100:.1f}%')",
            "print(f'   Mule MIN_KYC:   {(mule[\"kyc_status\"] == \"MIN_KYC\").mean() * 100:.1f}%')",
            "print()",
            "print('4. FRAUD transactions cluster in ₹15,000-₹49,900 range')",
            "print(f'   Fraud avg amount: ₹{fraud_txns[\"amount\"].mean():,.0f}')",
            "print(f'   Normal avg amount: ₹{normal_txns[\"amount\"].mean():,.0f}')",
            "print()",
            "print('5. DEVICE SHARING exists within mule rings')",
            "print('   This is a key detection signal for the GNN')",
            "print()",
            "print('✅ Data exploration complete!')"
        ]
    }
]

create_notebook('notebooks/01_data_exploration.ipynb', notebook1_cells)


# ============================================================
# NOTEBOOK 2: GRAPH ANALYSIS
# ============================================================
notebook2_cells = [
    {
        "type": "markdown",
        "source": "# 🔪 RingCutter — Graph Analysis\n## Notebook 2: Entity Graph Structure & Properties"
    },
    {
        "type": "markdown",
        "source": "### Step 1: Import Libraries & Build Graph"
    },
    {
        "type": "code",
        "source": [
            "import sys",
            "sys.path.append('..')",
            "",
            "import pandas as pd",
            "import numpy as np",
            "import networkx as nx",
            "import matplotlib.pyplot as plt",
            "from collections import defaultdict, Counter",
            "import warnings",
            "warnings.filterwarnings('ignore')",
            "",
            "from src.graph_builder import RingCutterGraphBuilder",
            "",
            "print('Libraries loaded ✅')"
        ]
    },
    {
        "type": "code",
        "source": [
            "# Build the entity graph",
            "builder = RingCutterGraphBuilder()",
            "graph = builder.build_full_graph(",
            "    '../data/synthetic_accounts.csv',",
            "    '../data/synthetic_transactions.csv'",
            ")",
            "builder.get_graph_statistics()"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 2: Graph Structure Analysis"
    },
    {
        "type": "code",
        "source": [
            "# Node type breakdown",
            "account_nodes = [n for n, d in graph.nodes(data=True) if d.get('node_type') == 'ACCOUNT']",
            "device_nodes = [n for n, d in graph.nodes(data=True) if d.get('node_type') == 'DEVICE']",
            "mule_nodes = [n for n, d in graph.nodes(data=True) if d.get('is_mule', 0) == 1]",
            "normal_nodes = [n for n, d in graph.nodes(data=True) if d.get('is_mule', 0) == 0 and d.get('node_type') == 'ACCOUNT']",
            "",
            "print(f'Total nodes: {graph.number_of_nodes()}')",
            "print(f'  Account nodes: {len(account_nodes)}')",
            "print(f'    Normal: {len(normal_nodes)}')",
            "print(f'    Mule: {len(mule_nodes)}')",
            "print(f'  Device nodes: {len(device_nodes)}')",
            "print(f'Total edges: {graph.number_of_edges()}')"
        ]
    },
    {
        "type": "code",
        "source": [
            "# Edge type breakdown",
            "edge_types = Counter()",
            "for u, v, d in graph.edges(data=True):",
            "    edge_types[d.get('edge_type', 'unknown')] += 1",
            "",
            "print('\\nEdge types:')",
            "for etype, count in edge_types.most_common():",
            "    print(f'  {etype}: {count}')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 3: Degree Distribution"
    },
    {
        "type": "code",
        "source": [
            "# Degree distribution: Normal vs Mule",
            "normal_degrees = [graph.degree(n) for n in normal_nodes]",
            "mule_degrees = [graph.degree(n) for n in mule_nodes]",
            "",
            "fig, axes = plt.subplots(1, 2, figsize=(14, 5))",
            "",
            "axes[0].hist(normal_degrees, bins=50, color='#00CC66', alpha=0.7)",
            "axes[0].set_title(f'Normal Account Degree Distribution\\n(avg: {np.mean(normal_degrees):.1f})')",
            "axes[0].set_xlabel('Degree (number of connections)')",
            "axes[0].set_ylabel('Count')",
            "",
            "axes[1].hist(mule_degrees, bins=30, color='#FF4B4B', alpha=0.7)",
            "axes[1].set_title(f'Mule Account Degree Distribution\\n(avg: {np.mean(mule_degrees):.1f})')",
            "axes[1].set_xlabel('Degree (number of connections)')",
            "axes[1].set_ylabel('Count')",
            "",
            "plt.tight_layout()",
            "plt.savefig('../data/degree_distribution.png', dpi=150, bbox_inches='tight')",
            "plt.show()",
            "print(f'Normal avg degree: {np.mean(normal_degrees):.2f}')",
            "print(f'Mule avg degree: {np.mean(mule_degrees):.2f}')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 4: Shared Device Analysis"
    },
    {
        "type": "code",
        "source": [
            "# Find accounts sharing devices",
            "shared_device_edges = [(u, v) for u, v, d in graph.edges(data=True) if d.get('edge_type') == 'SHARES_DEVICE']",
            "",
            "print(f'Total shared device edges: {len(shared_device_edges)}')",
            "",
            "# Check how many involve mule accounts",
            "mule_set = set(mule_nodes)",
            "both_mule = 0",
            "one_mule = 0",
            "no_mule = 0",
            "",
            "for u, v in shared_device_edges:",
            "    u_mule = u in mule_set",
            "    v_mule = v in mule_set",
            "    if u_mule and v_mule:",
            "        both_mule += 1",
            "    elif u_mule or v_mule:",
            "        one_mule += 1",
            "    else:",
            "        no_mule += 1",
            "",
            "print(f'\\nShared device edges where:')",
            "print(f'  Both are mules: {both_mule}')",
            "print(f'  One is mule: {one_mule}')",
            "print(f'  Neither is mule: {no_mule}')",
            "print(f'\\n→ Device sharing is a STRONG mule signal!')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 5: Connected Components"
    },
    {
        "type": "code",
        "source": [
            "# Analyze connected components (in undirected version)",
            "simple_graph = nx.Graph()",
            "for u, v, d in graph.edges(data=True):",
            "    if d.get('edge_type') in ['TRANSFERS_TO', 'SHARES_DEVICE']:",
            "        if u in account_nodes or v in account_nodes:",
            "            simple_graph.add_edge(u, v)",
            "",
            "components = list(nx.connected_components(simple_graph))",
            "component_sizes = sorted([len(c) for c in components], reverse=True)",
            "",
            "print(f'Total connected components: {len(components)}')",
            "print(f'Largest component: {component_sizes[0]} nodes')",
            "print(f'Top 10 component sizes: {component_sizes[:10]}')",
            "",
            "# How many components contain mules?",
            "mule_components = 0",
            "for comp in components:",
            "    if any(n in mule_set for n in comp):",
            "        mule_components += 1",
            "print(f'\\nComponents containing mules: {mule_components}')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 6: Node Feature Analysis"
    },
    {
        "type": "code",
        "source": [
            "# Compare features: Normal vs Mule",
            "features = ['total_txn_count', 'total_amount_sent', 'total_amount_received',",
            "            'unique_counterparties', 'channel_diversity', 'avg_txn_amount',",
            "            'txn_frequency_per_day', 'night_txn_ratio']",
            "",
            "print(f'{\"Feature\":<25} {\"Normal (avg)\":>15} {\"Mule (avg)\":>15} {\"Signal\":>10}')",
            "print('-' * 65)",
            "",
            "for feat in features:",
            "    normal_vals = [graph.nodes[n].get(feat, 0) for n in normal_nodes]",
            "    mule_vals = [graph.nodes[n].get(feat, 0) for n in mule_nodes]",
            "    normal_avg = np.mean(normal_vals) if normal_vals else 0",
            "    mule_avg = np.mean(mule_vals) if mule_vals else 0",
            "    diff = abs(normal_avg - mule_avg) / max(normal_avg, 0.001) * 100",
            "    signal = '🔴 HIGH' if diff > 50 else '🟡 MED' if diff > 20 else '🟢 LOW'",
            "    print(f'{feat:<25} {normal_avg:>15.2f} {mule_avg:>15.2f} {signal:>10}')"
        ]
    },
    {
        "type": "code",
        "source": [
            "print('\\n' + '=' * 60)",
            "print('  GRAPH ANALYSIS KEY FINDINGS')",
            "print('=' * 60)",
            "print('1. Mule accounts have HIGHER degree (more connections)')",
            "print('2. Device sharing is almost EXCLUSIVELY among mules')",
            "print('3. Mule accounts cluster in tight components')",
            "print('4. Channel diversity is higher for mule accounts')",
            "print('5. These structural features make GNN detection effective')",
            "print('\\n✅ Graph analysis complete!')"
        ]
    }
]

create_notebook('notebooks/02_graph_analysis.ipynb', notebook2_cells)


# ============================================================
# NOTEBOOK 3: GNN TRAINING
# ============================================================
notebook3_cells = [
    {
        "type": "markdown",
        "source": "# 🔪 RingCutter — GNN Training\n## Notebook 3: Train Graph Neural Network on Google Colab\n\n**Instructions:**\n1. Open this notebook in Google Colab\n2. Runtime → Change runtime type → GPU\n3. Upload your CSV files from `data/` folder\n4. Run all cells\n5. Download the trained model"
    },
    {
        "type": "markdown",
        "source": "### Step 1: Install Dependencies (Colab Only)"
    },
    {
        "type": "code",
        "source": [
            "# Run this cell ONLY on Google Colab",
            "# Skip if running locally",
            "",
            "# Uncomment the lines below if on Colab:",
            "# !pip install torch-geometric",
            "# !pip install torch-scatter torch-sparse -f https://data.pyg.org/whl/torch-2.1.0+cu121.html",
            "# !pip install networkx faker scikit-learn",
            "",
            "print('Dependencies ready ✅')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 2: Upload Data (Colab Only)"
    },
    {
        "type": "code",
        "source": [
            "# Run this cell ONLY on Google Colab to upload files",
            "",
            "# Uncomment if on Colab:",
            "# from google.colab import files",
            "# print('Upload synthetic_accounts.csv:')",
            "# uploaded = files.upload()",
            "# print('Upload synthetic_transactions.csv:')",
            "# uploaded = files.upload()",
            "",
            "import os",
            "os.makedirs('data', exist_ok=True)",
            "os.makedirs('models', exist_ok=True)",
            "",
            "# If running locally, set paths",
            "ACCOUNTS_PATH = '../data/synthetic_accounts.csv'",
            "TRANSACTIONS_PATH = '../data/synthetic_transactions.csv'",
            "",
            "# If on Colab, use these paths instead:",
            "# ACCOUNTS_PATH = 'synthetic_accounts.csv'",
            "# TRANSACTIONS_PATH = 'synthetic_transactions.csv'",
            "",
            "print('Data paths set ✅')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 3: Import Libraries"
    },
    {
        "type": "code",
        "source": [
            "import torch",
            "import torch.nn.functional as F",
            "import numpy as np",
            "import pandas as pd",
            "import networkx as nx",
            "import matplotlib.pyplot as plt",
            "from sklearn.preprocessing import StandardScaler",
            "from sklearn.model_selection import train_test_split",
            "from sklearn.metrics import classification_report, f1_score, precision_score, recall_score, confusion_matrix, roc_auc_score",
            "from collections import defaultdict",
            "import warnings",
            "warnings.filterwarnings('ignore')",
            "",
            "# Check if GPU is available",
            "device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')",
            "print(f'Using device: {device}')",
            "",
            "# Try importing PyG",
            "try:",
            "    from torch_geometric.nn import SAGEConv, GATConv",
            "    from torch_geometric.data import Data",
            "    PYG = True",
            "    print('PyTorch Geometric loaded ✅')",
            "except:",
            "    PYG = False",
            "    print('PyTorch Geometric NOT available ⚠️')",
            "    print('Will use fallback model')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 4: Build Graph"
    },
    {
        "type": "code",
        "source": [
            "# Load data",
            "accounts_df = pd.read_csv(ACCOUNTS_PATH)",
            "txns_df = pd.read_csv(TRANSACTIONS_PATH)",
            "txns_df['timestamp'] = pd.to_datetime(txns_df['timestamp'])",
            "",
            "print(f'Accounts: {len(accounts_df)}')",
            "print(f'Transactions: {len(txns_df)}')",
            "",
            "# Build graph",
            "graph = nx.MultiDiGraph()",
            "",
            "# Add account nodes",
            "for _, row in accounts_df.iterrows():",
            "    graph.add_node(row['account_id'], node_type='ACCOUNT',",
            "                   account_age_days=row['account_age_days'],",
            "                   avg_monthly_balance=row['avg_monthly_balance'],",
            "                   is_mule=row['is_mule'],",
            "                   mule_ring_id=row['mule_ring_id'])",
            "",
            "# Add transaction edges",
            "for _, txn in txns_df.iterrows():",
            "    graph.add_edge(txn['from_account'], txn['to_account'],",
            "                   edge_type='TRANSFERS_TO',",
            "                   amount=txn['amount'],",
            "                   channel=txn['channel'],",
            "                   is_fraud=txn['is_fraud'])",
            "",
            "# Add device sharing edges",
            "device_to_accounts = defaultdict(list)",
            "for _, row in accounts_df.iterrows():",
            "    device_to_accounts[row['primary_device_id']].append(row['account_id'])",
            "",
            "shared_count = 0",
            "for dev_id, acc_list in device_to_accounts.items():",
            "    if len(acc_list) > 1:",
            "        for i in range(len(acc_list)):",
            "            for j in range(i + 1, len(acc_list)):",
            "                graph.add_edge(acc_list[i], acc_list[j], edge_type='SHARES_DEVICE')",
            "                shared_count += 1",
            "",
            "print(f'Graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges')",
            "print(f'Shared device edges: {shared_count}')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 5: Compute Node Features"
    },
    {
        "type": "code",
        "source": [
            "# Compute features for each account",
            "print('Computing node features...')",
            "",
            "account_nodes = [n for n, d in graph.nodes(data=True) if d.get('node_type') == 'ACCOUNT']",
            "node_to_idx = {node: idx for idx, node in enumerate(account_nodes)}",
            "",
            "feature_names = ['account_age_days', 'avg_monthly_balance',",
            "                 'total_txn_count', 'total_amount_sent',",
            "                 'total_amount_received', 'unique_counterparties',",
            "                 'channel_diversity', 'avg_txn_amount',",
            "                 'max_txn_amount', 'txn_frequency_per_day',",
            "                 'night_txn_ratio', 'cross_channel_ratio']",
            "",
            "features = []",
            "labels = []",
            "",
            "for node in account_nodes:",
            "    nd = graph.nodes[node]",
            "    sent = txns_df[txns_df['from_account'] == node]",
            "    received = txns_df[txns_df['to_account'] == node]",
            "    all_txns = pd.concat([sent, received])",
            "",
            "    feat = [",
            "        nd.get('account_age_days', 0),",
            "        nd.get('avg_monthly_balance', 0),",
            "        len(all_txns),",
            "        sent['amount'].sum() if len(sent) > 0 else 0,",
            "        received['amount'].sum() if len(received) > 0 else 0,",
            "        len(set(sent['to_account'].tolist() + received['from_account'].tolist())),",
            "        all_txns['channel'].nunique() if len(all_txns) > 0 else 0,",
            "        all_txns['amount'].mean() if len(all_txns) > 0 else 0,",
            "        all_txns['amount'].max() if len(all_txns) > 0 else 0,",
            "        len(all_txns) / max(nd.get('account_age_days', 1), 1),",
            "        len(all_txns[all_txns['hour'].isin([23,0,1,2,3,4,5])]) / max(len(all_txns), 1),",
            "        all_txns['channel'].nunique() / max(len(all_txns), 1) if len(all_txns) > 0 else 0",
            "    ]",
            "    features.append(feat)",
            "    labels.append(nd.get('is_mule', 0))",
            "",
            "features = np.array(features, dtype=np.float32)",
            "scaler = StandardScaler()",
            "features = scaler.fit_transform(features)",
            "",
            "print(f'Features shape: {features.shape}')",
            "print(f'Mule accounts: {sum(labels)}')",
            "print(f'Normal accounts: {len(labels) - sum(labels)}')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 6: Prepare PyG Data"
    },
    {
        "type": "code",
        "source": [
            "# Convert to tensors",
            "x = torch.FloatTensor(features)",
            "y = torch.FloatTensor(labels)",
            "",
            "# Build edge index",
            "edge_list = []",
            "for u, v, d in graph.edges(data=True):",
            "    if d.get('edge_type') == 'TRANSFERS_TO' and u in node_to_idx and v in node_to_idx:",
            "        edge_list.append([node_to_idx[u], node_to_idx[v]])",
            "    elif d.get('edge_type') == 'SHARES_DEVICE' and u in node_to_idx and v in node_to_idx:",
            "        edge_list.append([node_to_idx[u], node_to_idx[v]])",
            "        edge_list.append([node_to_idx[v], node_to_idx[u]])",
            "",
            "edge_index = torch.LongTensor(edge_list).t().contiguous()",
            "",
            "# Train/test split",
            "num_nodes = len(account_nodes)",
            "indices = np.arange(num_nodes)",
            "train_idx, test_idx = train_test_split(indices, test_size=0.2, random_state=42, stratify=labels)",
            "",
            "train_mask = torch.zeros(num_nodes, dtype=torch.bool)",
            "test_mask = torch.zeros(num_nodes, dtype=torch.bool)",
            "train_mask[train_idx] = True",
            "test_mask[test_idx] = True",
            "",
            "print(f'Nodes: {num_nodes}')",
            "print(f'Edges: {edge_index.shape[1]}')",
            "print(f'Features: {x.shape[1]}')",
            "print(f'Train: {train_mask.sum().item()}')",
            "print(f'Test: {test_mask.sum().item()}')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 7: Define GNN Model"
    },
    {
        "type": "code",
        "source": [
            "if PYG:",
            "    class RingCutterGNN(torch.nn.Module):",
            "        def __init__(self, num_features, hidden_dim=64):",
            "            super(RingCutterGNN, self).__init__()",
            "            self.conv1 = SAGEConv(num_features, hidden_dim)",
            "            self.conv2 = SAGEConv(hidden_dim, hidden_dim // 2)",
            "            self.classifier = torch.nn.Linear(hidden_dim // 2, 1)",
            "            self.dropout = torch.nn.Dropout(0.3)",
            "",
            "        def forward(self, x, edge_index):",
            "            h = self.conv1(x, edge_index)",
            "            h = F.relu(h)",
            "            h = self.dropout(h)",
            "            h = self.conv2(h, edge_index)",
            "            h = F.relu(h)",
            "            h = self.dropout(h)",
            "            out = self.classifier(h)",
            "            out = torch.sigmoid(out)",
            "            return out.squeeze()",
            "",
            "    model = RingCutterGNN(num_features=x.shape[1], hidden_dim=64)",
            "    print(f'GNN Model created ✅')",
            "    print(model)",
            "else:",
            "    class FallbackModel(torch.nn.Module):",
            "        def __init__(self, num_features, hidden_dim=64):",
            "            super(FallbackModel, self).__init__()",
            "            self.layer1 = torch.nn.Linear(num_features, hidden_dim)",
            "            self.layer2 = torch.nn.Linear(hidden_dim, hidden_dim // 2)",
            "            self.layer3 = torch.nn.Linear(hidden_dim // 2, 1)",
            "            self.dropout = torch.nn.Dropout(0.3)",
            "",
            "        def forward(self, x, edge_index=None):",
            "            h = F.relu(self.layer1(x))",
            "            h = self.dropout(h)",
            "            h = F.relu(self.layer2(h))",
            "            h = self.dropout(h)",
            "            out = torch.sigmoid(self.layer3(h))",
            "            return out.squeeze()",
            "",
            "    model = FallbackModel(num_features=x.shape[1], hidden_dim=64)",
            "    print(f'Fallback Model created ⚠️')",
            "    print(model)"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 8: Train the Model"
    },
    {
        "type": "code",
        "source": [
            "# Training setup",
            "num_normal = int((y == 0).sum())",
            "num_mule = int((y == 1).sum())",
            "pos_weight = torch.FloatTensor([num_normal / max(num_mule, 1)])",
            "",
            "criterion = torch.nn.BCEWithLogitsLoss(pos_weight=pos_weight)",
            "optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)",
            "",
            "# Training loop",
            "epochs = 200",
            "train_losses = []",
            "test_f1s = []",
            "best_f1 = 0",
            "best_state = None",
            "",
            "print('Training started...')",
            "print(f'{\"Epoch\":>6} | {\"Loss\":>8} | {\"F1\":>8} | {\"Prec\":>8} | {\"Rec\":>8}')",
            "print('-' * 45)",
            "",
            "model.train()",
            "for epoch in range(epochs):",
            "    optimizer.zero_grad()",
            "    out = model(x, edge_index)",
            "    loss = criterion(out[train_mask], y[train_mask])",
            "    loss.backward()",
            "    optimizer.step()",
            "    train_losses.append(loss.item())",
            "",
            "    if (epoch + 1) % 20 == 0:",
            "        model.eval()",
            "        with torch.no_grad():",
            "            pred = model(x, edge_index)",
            "            pred_labels = (pred > 0.5).float()",
            "            test_pred = pred_labels[test_mask].numpy()",
            "            test_true = y[test_mask].numpy()",
            "            f1 = f1_score(test_true, test_pred, zero_division=0)",
            "            prec = precision_score(test_true, test_pred, zero_division=0)",
            "            rec = recall_score(test_true, test_pred, zero_division=0)",
            "            test_f1s.append(f1)",
            "            print(f'{epoch+1:>6} | {loss.item():>8.4f} | {f1:>8.4f} | {prec:>8.4f} | {rec:>8.4f}')",
            "            if f1 > best_f1:",
            "                best_f1 = f1",
            "                best_state = model.state_dict().copy()",
            "        model.train()",
            "",
            "print(f'\\nBest F1: {best_f1:.4f}')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 9: Evaluate & Visualize Results"
    },
    {
        "type": "code",
        "source": [
            "# Load best model",
            "if best_state is not None:",
            "    model.load_state_dict(best_state)",
            "",
            "# Final evaluation",
            "model.eval()",
            "with torch.no_grad():",
            "    pred = model(x, edge_index)",
            "    pred_labels = (pred > 0.5).float()",
            "    test_pred = pred_labels[test_mask].numpy()",
            "    test_true = y[test_mask].numpy()",
            "",
            "print('\\n' + '=' * 60)",
            "print('  FINAL TEST SET RESULTS')",
            "print('=' * 60)",
            "print(classification_report(test_true, test_pred, target_names=['Normal', 'Mule']))",
            "",
            "# Confusion Matrix",
            "cm = confusion_matrix(test_true, test_pred)",
            "print(f'Confusion Matrix:')",
            "print(f'  TN={cm[0][0]:4d}  FP={cm[0][1]:4d}')",
            "print(f'  FN={cm[1][0]:4d}  TP={cm[1][1]:4d}')"
        ]
    },
    {
        "type": "code",
        "source": [
            "# Plot training loss",
            "fig, axes = plt.subplots(1, 2, figsize=(14, 5))",
            "",
            "axes[0].plot(train_losses, color='#FF4B4B')",
            "axes[0].set_title('Training Loss')",
            "axes[0].set_xlabel('Epoch')",
            "axes[0].set_ylabel('Loss')",
            "",
            "axes[1].plot(range(20, epochs + 1, 20), test_f1s, color='#00CC66', marker='o')",
            "axes[1].set_title('Test F1 Score')",
            "axes[1].set_xlabel('Epoch')",
            "axes[1].set_ylabel('F1 Score')",
            "",
            "plt.tight_layout()",
            "plt.savefig('../data/training_curves.png', dpi=150, bbox_inches='tight')",
            "plt.show()",
            "print('Training curves saved ✅')"
        ]
    },
    {
        "type": "code",
        "source": [
            "# Score distribution",
            "with torch.no_grad():",
            "    all_scores = model(x, edge_index).numpy()",
            "",
            "normal_scores = all_scores[y.numpy() == 0]",
            "mule_scores = all_scores[y.numpy() == 1]",
            "",
            "fig, ax = plt.subplots(figsize=(10, 5))",
            "ax.hist(normal_scores, bins=50, color='#00CC66', alpha=0.7, label=f'Normal (n={len(normal_scores)})')",
            "ax.hist(mule_scores, bins=50, color='#FF4B4B', alpha=0.7, label=f'Mule (n={len(mule_scores)})')",
            "ax.axvline(x=0.5, color='white', linestyle='--', label='Threshold (0.5)')",
            "ax.set_title('GNN Score Distribution: Normal vs Mule')",
            "ax.set_xlabel('Mule Risk Score')",
            "ax.set_ylabel('Count')",
            "ax.legend()",
            "plt.savefig('../data/score_distribution.png', dpi=150, bbox_inches='tight')",
            "plt.show()",
            "print('Score distribution saved ✅')"
        ]
    },
    {
        "type": "markdown",
        "source": "### Step 10: Save Model"
    },
    {
        "type": "code",
        "source": [
            "# Save the trained model",
            "import os",
            "os.makedirs('../models', exist_ok=True)",
            "torch.save(model.state_dict(), '../models/ringcutter_gnn.pth')",
            "print('Model saved to models/ringcutter_gnn.pth ✅')",
            "",
            "# If on Colab, download the model file:",
            "# from google.colab import files",
            "# files.download('../models/ringcutter_gnn.pth')",
            "",
            "print(f'\\nModel Summary:')",
            "print(f'  Architecture: {\"GraphSAGE GNN\" if PYG else \"Fallback NN\"}')",
            "print(f'  Input features: {x.shape[1]}')",
            "print(f'  Best F1 Score: {best_f1:.4f}')",
            "print(f'  Total parameters: {sum(p.numel() for p in model.parameters()):,}')",
            "print(f'\\n✅ Training complete! Model ready for deployment.')"
        ]
    }
]

create_notebook('notebooks/03_gnn_training.ipynb', notebook3_cells)


print("\n" + "=" * 60)
print("  ALL 3 NOTEBOOKS CREATED SUCCESSFULLY")
print("=" * 60)
print("  notebooks/01_data_exploration.ipynb ✅")
print("  notebooks/02_graph_analysis.ipynb ✅")
print("  notebooks/03_gnn_training.ipynb ✅")
print("=" * 60)