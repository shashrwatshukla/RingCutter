"""
RingCutter — Alert Engine
PURPOSE: Combines GNN scores + velocity alerts + community
         scores into final risk decisions.

Risk Levels:
    🔴 HIGH   (score > 0.85) → AUTO-BLOCK
    🟡 MEDIUM (score 0.5-0.85) → Manual review
    🟢 LOW    (score < 0.5) → Monitor
"""

import pandas as pd
import numpy as np
from datetime import datetime


class AlertEngine:
    """
    Combines all detection signals into final risk decisions.
    """

    def __init__(self):
        self.alerts = []

    def compute_final_risk(
        self,
        account_id,
        gnn_score=0.0,
        velocity_alerts=None,
        community_score=0.0,
        pagerank_score=0.0,
        betweenness_score=0.0
    ):
        """
        Compute final risk score for an account.

        Formula:
        final_score = (
            0.40 × gnn_score +
            0.25 × velocity_score +
            0.20 × community_score +
            0.10 × pagerank_normalized +
            0.05 × betweenness_normalized
        )
        """
        # Calculate velocity score from alerts
        velocity_score = 0.0
        velocity_reasons = []

        if velocity_alerts is not None and len(
            velocity_alerts
        ) > 0:
            high_alerts = len([
                a for a in velocity_alerts
                if a.get('severity') == 'HIGH'
            ])
            medium_alerts = len([
                a for a in velocity_alerts
                if a.get('severity') == 'MEDIUM'
            ])
            velocity_score = min(
                (high_alerts * 0.3 + medium_alerts * 0.15),
                1.0
            )
            velocity_reasons = [
                a.get('description', '')
                for a in velocity_alerts
            ]

        # Normalize scores to 0-1 range
        pr_norm = min(pagerank_score * 1000, 1.0)
        bc_norm = min(betweenness_score * 100, 1.0)

        # Weighted final score
        final_score = (
            0.40 * gnn_score +
            0.25 * velocity_score +
            0.20 * community_score +
            0.10 * pr_norm +
            0.05 * bc_norm
        )

        # Determine risk level and action
        if final_score > 0.85:
            risk_level = 'HIGH'
            action = 'AUTO_BLOCK'
            color = '🔴'
        elif final_score > 0.50:
            risk_level = 'MEDIUM'
            action = 'MANUAL_REVIEW'
            color = '🟡'
        else:
            risk_level = 'LOW'
            action = 'MONITOR'
            color = '🟢'

        alert = {
            'account_id': account_id,
            'final_score': round(final_score, 4),
            'risk_level': risk_level,
            'action': action,
            'color': color,
            'gnn_score': round(gnn_score, 4),
            'velocity_score': round(velocity_score, 4),
            'community_score': round(community_score, 4),
            'pagerank_score': round(pr_norm, 4),
            'betweenness_score': round(bc_norm, 4),
            'velocity_reasons': velocity_reasons,
            'timestamp': datetime.now().isoformat()
        }

        self.alerts.append(alert)
        return alert

    def get_summary(self):
        """Get summary statistics of all alerts."""
        df = pd.DataFrame(self.alerts)
        if len(df) == 0:
            return "No alerts generated"

        summary = {
            'total_accounts_scored': len(df),
            'high_risk': len(
                df[df['risk_level'] == 'HIGH']
            ),
            'medium_risk': len(
                df[df['risk_level'] == 'MEDIUM']
            ),
            'low_risk': len(
                df[df['risk_level'] == 'LOW']
            ),
            'auto_blocked': len(
                df[df['action'] == 'AUTO_BLOCK']
            ),
            'avg_score': round(df['final_score'].mean(), 4)
        }
        return summary

    def get_alerts_dataframe(self):
        """Return all alerts as a pandas DataFrame."""
        return pd.DataFrame(self.alerts)


# ============================================================
# RUN THIS FILE TO TEST THE ALERT ENGINE
# ============================================================
if __name__ == "__main__":
    engine = AlertEngine()

    # Test 1: HIGH risk mule account
    alert1 = engine.compute_final_risk(
        account_id="IB1234567890",
        gnn_score=0.92,
        velocity_alerts=[
            {
                'severity': 'HIGH',
                'description': '4 channels in 18 min'
            }
        ],
        community_score=0.88,
        pagerank_score=0.005,
        betweenness_score=0.02
    )
    print(
        f"Test 1: {alert1['color']} {alert1['risk_level']} "
        f"— Score: {alert1['final_score']} "
        f"— Action: {alert1['action']}"
    )

    # Test 2: LOW risk normal account
    alert2 = engine.compute_final_risk(
        account_id="IB9876543210",
        gnn_score=0.12,
        velocity_alerts=[],
        community_score=0.05,
        pagerank_score=0.0001,
        betweenness_score=0.0001
    )
    print(
        f"Test 2: {alert2['color']} {alert2['risk_level']} "
        f"— Score: {alert2['final_score']} "
        f"— Action: {alert2['action']}"
    )

    # Test 3: MEDIUM risk suspicious account
    alert3 = engine.compute_final_risk(
        account_id="IB5555555555",
        gnn_score=0.55,
        velocity_alerts=[
            {
                'severity': 'MEDIUM',
                'description': 'Structuring detected'
            }
        ],
        community_score=0.40,
        pagerank_score=0.001,
        betweenness_score=0.005
    )
    print(
        f"Test 3: {alert3['color']} {alert3['risk_level']} "
        f"— Score: {alert3['final_score']} "
        f"— Action: {alert3['action']}"
    )

    print(f"\nSummary: {engine.get_summary()}")
    print("\n✅ Alert Engine Working!")