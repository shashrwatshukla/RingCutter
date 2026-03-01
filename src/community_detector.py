"""
RingCutter — Community (Ring) Detector
PURPOSE: Finds groups of connected mule accounts (rings)
         using graph community detection algorithms.

Algorithms Used:
    1. Louvain — Finds tightly-connected communities
    2. PageRank — Finds most central/important nodes
    3. Betweenness Centrality — Finds bridge accounts
"""

import networkx as nx
import numpy as np
from collections import defaultdict

# Try importing python-louvain
try:
    import community as community_louvain
    LOUVAIN_AVAILABLE = True
except ImportError:
    LOUVAIN_AVAILABLE = False
    print("WARNING: python-louvain not installed.")
    print("Install with: pip install python-louvain")


class CommunityDetector:
    """
    Detects mule rings using graph community detection.
    """

    def __init__(self, graph):
        self.full_graph = graph

        # Create a simple undirected graph for community detection
        # (Louvain works on undirected graphs)
        self.simple_graph = nx.Graph()

        # Add account-to-account transfer edges
        for u, v, data in graph.edges(data=True):
            if data.get('edge_type') == 'TRANSFERS_TO':
                if self.simple_graph.has_edge(u, v):
                    # Multiple transactions = stronger connection
                    self.simple_graph[u][v]['weight'] += 1
                else:
                    self.simple_graph.add_edge(
                        u, v, weight=1
                    )

        # Add shared device edges (very strong signal)
        for u, v, data in graph.edges(data=True):
            if data.get('edge_type') == 'SHARES_DEVICE':
                if self.simple_graph.has_edge(u, v):
                    self.simple_graph[u][v]['weight'] += 5
                else:
                    self.simple_graph.add_edge(
                        u, v, weight=5
                    )

        print(f"Community graph: "
              f"{self.simple_graph.number_of_nodes()} nodes, "
              f"{self.simple_graph.number_of_edges()} edges")

    def detect_communities_louvain(self):
        """
        Louvain Community Detection

        Groups nodes into communities where nodes have
        MORE connections WITHIN the group than OUTSIDE.

        Returns communities with 3+ members (potential rings).
        """
        print("\nRunning Louvain Community Detection...")

        if not LOUVAIN_AVAILABLE:
            print("  Louvain not available. Using connected "
                  "components instead.")
            communities = {}
            for idx, component in enumerate(
                nx.connected_components(self.simple_graph)
            ):
                if len(component) >= 3:
                    communities[idx] = list(component)
            partition = {}
            for cid, members in communities.items():
                for m in members:
                    partition[m] = cid
            return communities, partition

        # Run Louvain algorithm
        partition = community_louvain.best_partition(
            self.simple_graph,
            weight='weight',
            random_state=42
        )

        # Organize: community_id → list of members
        communities = defaultdict(list)
        for node, community_id in partition.items():
            communities[community_id].append(node)

        # Keep only communities with 3+ members
        suspicious_communities = {
            cid: members
            for cid, members in communities.items()
            if len(members) >= 3
        }

        print(f"  Total communities: {len(communities)}")
        print(f"  Communities with 3+ members: "
              f"{len(suspicious_communities)}")

        return suspicious_communities, partition

    def compute_pagerank(self):
        """
        PageRank — Finds the most important nodes.

        The "boss" of a mule ring typically has high
        PageRank because many accounts send money to them.
        """
        print("\nComputing PageRank...")
        pagerank = nx.pagerank(
            self.simple_graph, weight='weight'
        )

        sorted_pr = sorted(
            pagerank.items(),
            key=lambda x: x[1],
            reverse=True
        )

        print(f"  Top 10 accounts by PageRank:")
        for account, score in sorted_pr[:10]:
            is_mule = self.full_graph.nodes[account].get(
                'is_mule', 'unknown'
            )
            print(f"    {account}: {score:.6f} "
                  f"(mule: {is_mule})")

        return pagerank

    def compute_betweenness_centrality(self):
        """
        Betweenness Centrality — Finds bridge accounts.

        These accounts sit BETWEEN different parts of a ring.
        Blocking them breaks the money flow.
        """
        print("\nComputing Betweenness Centrality...")
        betweenness = nx.betweenness_centrality(
            self.simple_graph, weight='weight'
        )

        sorted_bc = sorted(
            betweenness.items(),
            key=lambda x: x[1],
            reverse=True
        )

        print(f"  Top 10 bridge accounts:")
        for account, score in sorted_bc[:10]:
            is_mule = self.full_graph.nodes[account].get(
                'is_mule', 'unknown'
            )
            print(f"    {account}: {score:.6f} "
                  f"(mule: {is_mule})")

        return betweenness

    def score_communities(
        self, communities, gnn_scores=None
    ):
        """
        Score each community for mule ring likelihood.

        Scoring factors:
            1. GNN score of members (if available)
            2. Internal edge density
            3. Average account age (newer = more suspicious)
            4. Community size
        """
        print("\nScoring communities...")
        scored_communities = []

        for cid, members in communities.items():
            # Calculate internal density
            subgraph = self.simple_graph.subgraph(members)
            density = nx.density(subgraph)

            # Average account age
            ages = []
            for member in members:
                if self.full_graph.has_node(member):
                    age = self.full_graph.nodes[member].get(
                        'account_age_days', 365
                    )
                    ages.append(age)
            avg_age = np.mean(ages) if ages else 365

            # GNN score
            avg_gnn_score = 0.5
            if gnn_scores is not None:
                member_scores = [
                    gnn_scores.get(m, 0.5) for m in members
                ]
                avg_gnn_score = np.mean(member_scores)

            # Composite ring score
            ring_score = (
                0.4 * avg_gnn_score +
                0.3 * density +
                0.2 * (1 - min(avg_age / 365, 1)) +
                0.1 * (len(members) / 20)
            )

            # Count actual mules (for evaluation only)
            actual_mules = sum(
                1 for m in members
                if self.full_graph.nodes.get(m, {}).get(
                    'is_mule', 0
                ) == 1
            )

            scored_communities.append({
                'community_id': cid,
                'members': members,
                'size': len(members),
                'density': density,
                'avg_account_age': avg_age,
                'avg_gnn_score': avg_gnn_score,
                'ring_score': ring_score,
                'actual_mules': actual_mules,
                'mule_ratio': actual_mules / max(
                    len(members), 1
                )
            })

        # Sort by ring score (highest = most suspicious)
        scored_communities.sort(
            key=lambda x: x['ring_score'], reverse=True
        )

        print(f"\n  Top 10 Suspicious Communities:")
        print(f"  {'ID':>4} | {'Size':>4} | {'Score':>6} | "
              f"{'Density':>7} | {'Mules':>5} | {'Ratio':>5}")
        print(f"  {'-' * 4} | {'-' * 4} | {'-' * 6} | "
              f"{'-' * 7} | {'-' * 5} | {'-' * 5}")

        for comm in scored_communities[:10]:
            print(
                f"  {comm['community_id']:4d} | "
                f"{comm['size']:4d} | "
                f"{comm['ring_score']:.4f} | "
                f"{comm['density']:.4f}  | "
                f"{comm['actual_mules']:5d} | "
                f"{comm['mule_ratio']:.3f}"
            )

        return scored_communities

    def run_full_analysis(self, gnn_scores=None):
        """Run complete community detection pipeline."""
        print("\n" + "=" * 60)
        print("  RINGCUTTER — Community (Ring) Detector")
        print("=" * 60)

        communities, partition = (
            self.detect_communities_louvain()
        )
        pagerank = self.compute_pagerank()
        betweenness = self.compute_betweenness_centrality()
        scored = self.score_communities(
            communities, gnn_scores
        )

        print("\n" + "=" * 60)
        print("  RING DETECTION COMPLETE")
        print("=" * 60)

        return {
            'communities': communities,
            'partition': partition,
            'pagerank': pagerank,
            'betweenness': betweenness,
            'scored_communities': scored
        }


# ============================================================
# RUN THIS FILE TO DETECT COMMUNITIES
# ============================================================
if __name__ == "__main__":
    import sys
    sys.path.append('.')
    from src.graph_builder import RingCutterGraphBuilder

    builder = RingCutterGraphBuilder()
    graph = builder.build_full_graph(
        'data/synthetic_accounts.csv',
        'data/synthetic_transactions.csv'
    )

    detector = CommunityDetector(graph)
    results = detector.run_full_analysis()
    print("\n✅ Community Detection Complete!")