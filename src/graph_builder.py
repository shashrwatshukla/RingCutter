"""
RingCutter — Entity Graph Builder
PURPOSE: Converts CSV data into a graph structure where
         accounts are nodes and transactions are edges.
         Also adds device nodes and shared-device edges.
"""

import pandas as pd
import numpy as np
import networkx as nx
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')


class RingCutterGraphBuilder:
    """
    Builds a heterogeneous entity graph from transaction data.

    Node Types:
        ACCOUNT — Bank accounts (normal + mule)
        DEVICE  — Physical devices used to transact

    Edge Types:
        TRANSFERS_TO  — Money flow between accounts
        USES_DEVICE   — Account logged in from a device
        SHARES_DEVICE — Two accounts using the same device
    """

    def __init__(self):
        # MultiDiGraph = directed graph that allows multiple
        # edges between same pair of nodes
        self.graph = nx.MultiDiGraph()
        self.account_features = {}
        self.accounts_df = None
        self.txns_df = None

    def load_data(self, accounts_path, transactions_path):
        """Load CSV files into pandas DataFrames."""
        print("Loading data...")
        self.accounts_df = pd.read_csv(accounts_path)
        self.txns_df = pd.read_csv(transactions_path)
        self.txns_df['timestamp'] = pd.to_datetime(
            self.txns_df['timestamp']
        )
        print(f"  Loaded {len(self.accounts_df)} accounts")
        print(f"  Loaded {len(self.txns_df)} transactions")

    def add_account_nodes(self):
        """Add all bank accounts as nodes in the graph."""
        print("Adding account nodes...")
        for _, row in self.accounts_df.iterrows():
            self.graph.add_node(
                row['account_id'],
                node_type='ACCOUNT',
                account_age_days=row['account_age_days'],
                avg_monthly_balance=row['avg_monthly_balance'],
                city=row['city'],
                kyc_status=row['kyc_status'],
                is_mule=row['is_mule'],
                mule_ring_id=row['mule_ring_id'],
                latitude=row['latitude'],
                longitude=row['longitude']
            )
        print(f"  Added {len(self.accounts_df)} account nodes")

    def add_device_nodes(self):
        """
        Add device nodes and edges.

        KEY INSIGHT:
        When multiple mule accounts share the same physical
        device, it is a VERY strong signal that they belong
        to the same criminal ring.
        """
        print("Adding device nodes and edges...")
        device_to_accounts = defaultdict(list)

        for _, row in self.accounts_df.iterrows():
            device_id = row['primary_device_id']
            account_id = row['account_id']

            # Add device node if it doesn't exist yet
            if not self.graph.has_node(device_id):
                self.graph.add_node(
                    device_id,
                    node_type='DEVICE'
                )

            # Add edge: account → device (USES_DEVICE)
            self.graph.add_edge(
                account_id, device_id,
                edge_type='USES_DEVICE'
            )

            # Track which accounts use which device
            device_to_accounts[device_id].append(account_id)

        # Add SHARES_DEVICE edges between accounts on same device
        shared_device_count = 0
        for device_id, account_list in device_to_accounts.items():
            if len(account_list) > 1:
                # Connect every pair of accounts sharing this device
                for i in range(len(account_list)):
                    for j in range(i + 1, len(account_list)):
                        self.graph.add_edge(
                            account_list[i],
                            account_list[j],
                            edge_type='SHARES_DEVICE',
                            device_id=device_id
                        )
                        shared_device_count += 1

        print(f"  Added {len(device_to_accounts)} device nodes")
        print(f"  Added {shared_device_count} shared-device edges")

    def add_transaction_edges(self):
        """Add TRANSFERS_TO edges from transaction data."""
        print("Adding transaction edges...")
        for _, txn in self.txns_df.iterrows():
            self.graph.add_edge(
                txn['from_account'],
                txn['to_account'],
                edge_type='TRANSFERS_TO',
                txn_id=txn['txn_id'],
                amount=txn['amount'],
                channel=txn['channel'],
                timestamp=str(txn['timestamp']),
                is_fraud=txn['is_fraud']
            )
        print(f"  Added {len(self.txns_df)} transaction edges")

    def compute_node_features(self):
        """
        Compute numerical features for each account node.
        These features will be fed into the GNN model.

        Features computed:
        1.  account_age_days       — How old the account is
        2.  avg_monthly_balance    — Average balance
        3.  total_txn_count        — Total transactions made
        4.  total_amount_sent      — Total money sent out
        5.  total_amount_received  — Total money received
        6.  unique_counterparties  — How many different people
        7.  channel_diversity      — How many channels used (1-5)
        8.  avg_txn_amount         — Average transaction amount
        9.  max_txn_amount         — Largest single transaction
        10. txn_frequency_per_day  — Average transactions per day
        11. night_txn_ratio        — % of transactions at night
        12. cross_channel_ratio    — Channel variety per txn
        """
        print("Computing node features...")

        for _, account in self.accounts_df.iterrows():
            acc_id = account['account_id']

            # Get all transactions where this account is sender
            sent = self.txns_df[
                self.txns_df['from_account'] == acc_id
            ]

            # Get all transactions where this account is receiver
            received = self.txns_df[
                self.txns_df['to_account'] == acc_id
            ]

            # Combine sent and received
            all_txns = pd.concat([sent, received])

            # Calculate each feature
            features = {
                'account_age_days': account['account_age_days'],

                'avg_monthly_balance': account[
                    'avg_monthly_balance'
                ],

                'total_txn_count': len(all_txns),

                'total_amount_sent': (
                    sent['amount'].sum() if len(sent) > 0 else 0
                ),

                'total_amount_received': (
                    received['amount'].sum()
                    if len(received) > 0 else 0
                ),

                'unique_counterparties': len(set(
                    sent['to_account'].tolist() +
                    received['from_account'].tolist()
                )),

                'channel_diversity': (
                    all_txns['channel'].nunique()
                    if len(all_txns) > 0 else 0
                ),

                'avg_txn_amount': (
                    all_txns['amount'].mean()
                    if len(all_txns) > 0 else 0
                ),

                'max_txn_amount': (
                    all_txns['amount'].max()
                    if len(all_txns) > 0 else 0
                ),

                'txn_frequency_per_day': (
                    len(all_txns) /
                    max(account['account_age_days'], 1)
                ),

                'night_txn_ratio': (
                    len(all_txns[
                        all_txns['hour'].isin(
                            [23, 0, 1, 2, 3, 4, 5]
                        )
                    ]) / max(len(all_txns), 1)
                ),

                'cross_channel_ratio': (
                    all_txns['channel'].nunique() /
                    max(len(all_txns), 1)
                    if len(all_txns) > 0 else 0
                )
            }

            # Store features
            self.account_features[acc_id] = features

            # Update the graph node with these features
            self.graph.nodes[acc_id].update(features)

        print(f"  Computed features for "
              f"{len(self.account_features)} accounts")

    def build_full_graph(self, accounts_path, transactions_path):
        """Master function: builds the complete entity graph."""
        print("\n" + "=" * 60)
        print("  RINGCUTTER — Entity Graph Builder")
        print("=" * 60)

        self.load_data(accounts_path, transactions_path)
        self.add_account_nodes()
        self.add_device_nodes()
        self.add_transaction_edges()
        self.compute_node_features()

        print("\n" + "=" * 60)
        print("  GRAPH CONSTRUCTION COMPLETE")
        print("=" * 60)
        print(f"  Total Nodes: {self.graph.number_of_nodes()}")
        print(f"  Total Edges: {self.graph.number_of_edges()}")
        print(f"  Account Nodes: {len(self.accounts_df)}")
        device_count = (
            self.graph.number_of_nodes() - len(self.accounts_df)
        )
        print(f"  Device Nodes: {device_count}")
        print("=" * 60)

        return self.graph

    def get_graph_statistics(self):
        """Print useful statistics about the graph."""
        account_nodes = [
            n for n, d in self.graph.nodes(data=True)
            if d.get('node_type') == 'ACCOUNT'
        ]
        device_nodes = [
            n for n, d in self.graph.nodes(data=True)
            if d.get('node_type') == 'DEVICE'
        ]
        transfer_edges = [
            (u, v) for u, v, d in self.graph.edges(data=True)
            if d.get('edge_type') == 'TRANSFERS_TO'
        ]
        shared_device_edges = [
            (u, v) for u, v, d in self.graph.edges(data=True)
            if d.get('edge_type') == 'SHARES_DEVICE'
        ]

        print(f"\nGraph Statistics:")
        print(f"  Account nodes:       {len(account_nodes)}")
        print(f"  Device nodes:        {len(device_nodes)}")
        print(f"  Transfer edges:      {len(transfer_edges)}")
        print(f"  Shared device edges: {len(shared_device_edges)}")

        degrees = [
            self.graph.degree(n) for n in account_nodes
        ]
        print(f"  Avg degree: {np.mean(degrees):.2f}")
        print(f"  Max degree: {max(degrees)}")
        print(f"  Min degree: {min(degrees)}")


# ============================================================
# RUN THIS FILE TO BUILD THE GRAPH
# ============================================================
if __name__ == "__main__":
    builder = RingCutterGraphBuilder()
    graph = builder.build_full_graph(
        'data/synthetic_accounts.csv',
        'data/synthetic_transactions.csv'
    )
    builder.get_graph_statistics()