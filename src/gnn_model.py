"""
RingCutter — Graph Neural Network Model
PURPOSE: AI brain that learns mule patterns from the graph.
         Uses GraphSAGE architecture to detect mule accounts
         by analyzing their neighborhood structure.
"""

import torch
import torch.nn.functional as F
import numpy as np
import pandas as pd
import networkx as nx
import os
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, f1_score,
    precision_score, recall_score
)
import warnings
warnings.filterwarnings('ignore')

# Try importing PyTorch Geometric
# If it fails, we provide a fallback
try:
    from torch_geometric.nn import SAGEConv
    from torch_geometric.data import Data
    PYG_AVAILABLE = True
except ImportError:
    PYG_AVAILABLE = False
    print("WARNING: PyTorch Geometric not installed.")
    print("Will use fallback simple neural network.")


# ============================================================
# GNN MODEL (when PyTorch Geometric is available)
# ============================================================
if PYG_AVAILABLE:
    class RingCutterGNN(torch.nn.Module):
        """
        Graph Neural Network for Mule Account Detection.

        Architecture:
            Layer 1: GraphSAGE (learns from immediate neighbors)
            Layer 2: GraphSAGE (learns from 2-hop neighbors)
            Output:  Sigmoid → probability of being a mule

        Why GraphSAGE:
            - Works on new/unseen nodes (inductive learning)
            - Scales well to large graphs
            - Aggregates neighbor information effectively
        """

        def __init__(self, num_features, hidden_dim=64):
            super(RingCutterGNN, self).__init__()

            # Layer 1: input features → 64 hidden dimensions
            self.conv1 = SAGEConv(num_features, hidden_dim)

            # Layer 2: 64 → 32 dimensions
            self.conv2 = SAGEConv(hidden_dim, hidden_dim // 2)

            # Output layer: 32 → 1 (mule probability)
            self.classifier = torch.nn.Linear(
                hidden_dim // 2, 1
            )

            # Dropout prevents overfitting
            self.dropout = torch.nn.Dropout(0.3)

        def forward(self, x, edge_index):
            """
            Forward pass through the network.

            Args:
                x: Node features [num_nodes, num_features]
                edge_index: Edge connections [2, num_edges]

            Returns:
                Mule risk score for each node (0.0 to 1.0)
            """
            # Layer 1: aggregate neighbor info
            h = self.conv1(x, edge_index)
            h = F.relu(h)
            h = self.dropout(h)

            # Layer 2: aggregate 2-hop neighbor info
            h = self.conv2(h, edge_index)
            h = F.relu(h)
            h = self.dropout(h)

            # Output: classify as mule or not
            out = self.classifier(h)
            out = torch.sigmoid(out)

            return out.squeeze()


# ============================================================
# FALLBACK MODEL (when PyTorch Geometric is NOT available)
# ============================================================
class FallbackModel(torch.nn.Module):
    """
    Simple feedforward neural network fallback.
    Used when PyTorch Geometric cannot be installed.
    Less accurate than GNN but still works.
    """

    def __init__(self, num_features, hidden_dim=64):
        super(FallbackModel, self).__init__()
        self.layer1 = torch.nn.Linear(num_features, hidden_dim)
        self.layer2 = torch.nn.Linear(hidden_dim, hidden_dim // 2)
        self.layer3 = torch.nn.Linear(hidden_dim // 2, 1)
        self.dropout = torch.nn.Dropout(0.3)

    def forward(self, x, edge_index=None):
        """Forward pass (ignores edge_index)."""
        h = F.relu(self.layer1(x))
        h = self.dropout(h)
        h = F.relu(self.layer2(h))
        h = self.dropout(h)
        out = torch.sigmoid(self.layer3(h))
        return out.squeeze()


def prepare_pyg_data(graph, accounts_df):
    """
    Convert NetworkX graph to PyTorch Geometric format.

    Steps:
    1. Extract node features from graph
    2. Create edge_index (list of connections)
    3. Create labels (is_mule: 0 or 1)
    4. Split into train/test sets
    5. Package into PyG Data object
    """
    print("Preparing data for GNN training...")

    # Get only account nodes (not device nodes)
    account_nodes = [
        n for n, d in graph.nodes(data=True)
        if d.get('node_type') == 'ACCOUNT'
    ]

    # Create mapping: account_id → numeric index
    node_to_idx = {
        node: idx for idx, node in enumerate(account_nodes)
    }

    # ── EXTRACT NODE FEATURES ──
    feature_names = [
        'account_age_days', 'avg_monthly_balance',
        'total_txn_count', 'total_amount_sent',
        'total_amount_received', 'unique_counterparties',
        'channel_diversity', 'avg_txn_amount',
        'max_txn_amount', 'txn_frequency_per_day',
        'night_txn_ratio', 'cross_channel_ratio'
    ]

    features = []
    labels = []

    for node in account_nodes:
        node_data = graph.nodes[node]
        feature_vector = [
            node_data.get(f, 0) for f in feature_names
        ]
        features.append(feature_vector)
        labels.append(node_data.get('is_mule', 0))

    # Convert to numpy array and normalize
    features = np.array(features, dtype=np.float32)
    scaler = StandardScaler()
    features = scaler.fit_transform(features)

    # Convert to PyTorch tensors
    x = torch.FloatTensor(features)
    y = torch.FloatTensor(labels)

    # ── CREATE EDGE INDEX ──
    edge_list = []

    # Add TRANSFERS_TO edges
    for u, v, data in graph.edges(data=True):
        if (data.get('edge_type') == 'TRANSFERS_TO' and
                u in node_to_idx and v in node_to_idx):
            edge_list.append([node_to_idx[u], node_to_idx[v]])

    # Add SHARES_DEVICE edges (bidirectional — strong signal)
    for u, v, data in graph.edges(data=True):
        if (data.get('edge_type') == 'SHARES_DEVICE' and
                u in node_to_idx and v in node_to_idx):
            edge_list.append([node_to_idx[u], node_to_idx[v]])
            edge_list.append([node_to_idx[v], node_to_idx[u]])

    if len(edge_list) == 0:
        print("WARNING: No edges found!")
        edge_index = torch.zeros((2, 0), dtype=torch.long)
    else:
        edge_index = torch.LongTensor(edge_list).t().contiguous()

    # ── CREATE TRAIN/TEST SPLIT ──
    num_nodes = len(account_nodes)
    indices = np.arange(num_nodes)
    train_idx, test_idx = train_test_split(
        indices, test_size=0.2, random_state=42,
        stratify=labels
    )

    train_mask = torch.zeros(num_nodes, dtype=torch.bool)
    test_mask = torch.zeros(num_nodes, dtype=torch.bool)
    train_mask[train_idx] = True
    test_mask[test_idx] = True

    # Package into Data object
    if PYG_AVAILABLE:
        data = Data(
            x=x,
            edge_index=edge_index,
            y=y,
            train_mask=train_mask,
            test_mask=test_mask
        )
    else:
        # Simple namespace object for fallback
        class SimpleData:
            pass
        data = SimpleData()
        data.x = x
        data.edge_index = edge_index
        data.y = y
        data.train_mask = train_mask
        data.test_mask = test_mask
        data.num_nodes = num_nodes
        data.num_edges = edge_index.shape[1] if len(
            edge_list
        ) > 0 else 0
        data.num_node_features = x.shape[1]

    print(f"  Nodes: {num_nodes}")
    print(f"  Edges: {edge_index.shape[1] if len(edge_list) > 0 else 0}")
    print(f"  Features per node: {x.shape[1]}")
    print(f"  Mule accounts: {int(y.sum())}")
    print(f"  Normal accounts: {int(len(y) - y.sum())}")
    print(f"  Train set: {int(train_mask.sum())}")
    print(f"  Test set: {int(test_mask.sum())}")

    return data, node_to_idx, account_nodes, scaler


def train_model(data, epochs=200, lr=0.01):
    """
    Train the GNN (or fallback) model.

    Training process:
    1. Model looks at graph structure + node features
    2. Predicts: is each account a mule? (0 or 1)
    3. Checks prediction against truth
    4. Adjusts internal weights to improve
    5. Repeats for 200 epochs
    """
    print("\n" + "=" * 60)
    print("  TRAINING RINGCUTTER MODEL")
    print("=" * 60)

    # Choose model based on availability
    num_features = data.x.shape[1]

    if PYG_AVAILABLE:
        print("  Using: GraphSAGE GNN ✅")
        model = RingCutterGNN(
            num_features=num_features,
            hidden_dim=64
        )
    else:
        print("  Using: Fallback Neural Network ⚠️")
        model = FallbackModel(
            num_features=num_features,
            hidden_dim=64
        )

    # Handle class imbalance
    # Mules are rare (4%), so we tell the model:
    # "Getting a mule WRONG is 10x worse than getting
    #  a normal account wrong"
    num_normal = int((data.y == 0).sum())
    num_mule = int((data.y == 1).sum())
    pos_weight = torch.FloatTensor(
        [num_normal / max(num_mule, 1)]
    )

    criterion = torch.nn.BCEWithLogitsLoss(
        pos_weight=pos_weight
    )
    optimizer = torch.optim.Adam(
        model.parameters(), lr=lr, weight_decay=5e-4
    )

    model.train()
    best_f1 = 0
    best_model_state = None

    for epoch in range(epochs):
        optimizer.zero_grad()

        # Forward pass
        out = model(data.x, data.edge_index)

        # Calculate loss on training data only
        loss = criterion(
            out[data.train_mask],
            data.y[data.train_mask]
        )

        # Backward pass — adjust weights
        loss.backward()
        optimizer.step()

        # Evaluate every 20 epochs
        if (epoch + 1) % 20 == 0:
            model.eval()
            with torch.no_grad():
                pred = model(data.x, data.edge_index)
                pred_labels = (pred > 0.5).float()

                test_pred = pred_labels[data.test_mask]
                test_true = data.y[data.test_mask]

                f1 = f1_score(
                    test_true.numpy(),
                    test_pred.numpy(),
                    zero_division=0
                )
                precision = precision_score(
                    test_true.numpy(),
                    test_pred.numpy(),
                    zero_division=0
                )
                recall = recall_score(
                    test_true.numpy(),
                    test_pred.numpy(),
                    zero_division=0
                )

                print(
                    f"  Epoch {epoch+1:3d}/{epochs} | "
                    f"Loss: {loss.item():.4f} | "
                    f"F1: {f1:.4f} | "
                    f"Prec: {precision:.4f} | "
                    f"Rec: {recall:.4f}"
                )

                if f1 > best_f1:
                    best_f1 = f1
                    best_model_state = model.state_dict().copy()

            model.train()

    # Load best model
    if best_model_state is not None:
        model.load_state_dict(best_model_state)

    # Save model
    os.makedirs('models', exist_ok=True)
    torch.save(model.state_dict(), 'models/ringcutter_gnn.pth')
    print(f"\n  Best F1 Score: {best_f1:.4f}")
    print(f"  Model saved to: models/ringcutter_gnn.pth")

    # Final evaluation on test set
    model.eval()
    with torch.no_grad():
        pred = model(data.x, data.edge_index)
        pred_labels = (pred > 0.5).float()
        test_pred = pred_labels[data.test_mask]
        test_true = data.y[data.test_mask]

        print("\n  FINAL TEST SET RESULTS:")
        print(classification_report(
            test_true.numpy(),
            test_pred.numpy(),
            target_names=['Normal', 'Mule']
        ))

    return model, pred


# ============================================================
# RUN THIS FILE TO TRAIN THE MODEL
# ============================================================
if __name__ == "__main__":
    import sys
    sys.path.append('.')
    from src.graph_builder import RingCutterGraphBuilder

    os.makedirs('models', exist_ok=True)

    # Step 1: Build graph
    builder = RingCutterGraphBuilder()
    graph = builder.build_full_graph(
        'data/synthetic_accounts.csv',
        'data/synthetic_transactions.csv'
    )

    # Step 2: Prepare data
    data, node_to_idx, account_nodes, scaler = prepare_pyg_data(
        graph, builder.accounts_df
    )

    # Step 3: Train model
    model, predictions = train_model(data, epochs=200)

    print("\n✅ Model Training Complete!")