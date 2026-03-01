"""
RingCutter — Explainability Module
PURPOSE: Explains WHY an account was flagged as suspicious.
         Provides human-readable evidence for fraud analysts.
"""

import pandas as pd
import numpy as np


class RingCutterExplainer:
    """
    Generates human-readable explanations for why an
    account was flagged as a mule.
    """

    def __init__(self, accounts_df, txns_df):
        self.accounts_df = accounts_df
        self.txns_df = txns_df
        self.txns_df['timestamp'] = pd.to_datetime(
            self.txns_df['timestamp']
        )

    def explain_account(
        self, account_id, gnn_score=0.0,
        velocity_alerts=None, community_info=None
    ):
        """
        Generate a complete explanation for why an account
        was flagged.

        Returns a dictionary with:
            - risk_factors: list of specific reasons
            - evidence: supporting data
            - recommendation: suggested action
        """
        explanation = {
            'account_id': account_id,
            'risk_factors': [],
            'evidence': [],
            'recommendation': ''
        }

        # Get account data
        acc_data = self.accounts_df[
            self.accounts_df['account_id'] == account_id
        ]

        if len(acc_data) == 0:
            explanation['risk_factors'].append(
                "Account not found in database"
            )
            return explanation

        acc = acc_data.iloc[0]

        # ── CHECK 1: Account Age ──
        if acc['account_age_days'] < 90:
            explanation['risk_factors'].append(
                f"🔴 Very new account "
                f"({acc['account_age_days']} days old). "
                f"Mule accounts are typically opened recently."
            )
            explanation['evidence'].append({
                'factor': 'Account Age',
                'value': f"{acc['account_age_days']} days",
                'threshold': '< 90 days',
                'risk': 'HIGH'
            })

        # ── CHECK 2: Low Balance ──
        if acc['avg_monthly_balance'] < 5000:
            explanation['risk_factors'].append(
                f"🔴 Very low average balance "
                f"(₹{acc['avg_monthly_balance']:,}). "
                f"Mule accounts maintain minimal balances."
            )
            explanation['evidence'].append({
                'factor': 'Balance',
                'value': f"₹{acc['avg_monthly_balance']:,}",
                'threshold': '< ₹5,000',
                'risk': 'HIGH'
            })

        # ── CHECK 3: KYC Status ──
        if acc['kyc_status'] == 'MIN_KYC':
            explanation['risk_factors'].append(
                "🟡 Minimum KYC only. "
                "Full KYC not completed."
            )
            explanation['evidence'].append({
                'factor': 'KYC Status',
                'value': 'MIN_KYC',
                'threshold': 'Should be FULL_KYC',
                'risk': 'MEDIUM'
            })

        # ── CHECK 4: GNN Score ──
        if gnn_score > 0.7:
            explanation['risk_factors'].append(
                f"🔴 AI model scored this account "
                f"{gnn_score:.2f}/1.00. "
                f"Graph neighborhood matches mule patterns."
            )
            explanation['evidence'].append({
                'factor': 'GNN Score',
                'value': f"{gnn_score:.4f}",
                'threshold': '> 0.70',
                'risk': 'HIGH'
            })

        # ── CHECK 5: Transaction Patterns ──
        acc_txns = self.txns_df[
            (self.txns_df['from_account'] == account_id) |
            (self.txns_df['to_account'] == account_id)
        ]

        if len(acc_txns) > 0:
            channels_used = acc_txns['channel'].nunique()
            if channels_used >= 3:
                explanation['risk_factors'].append(
                    f"🔴 Used {channels_used} different "
                    f"channels. Cross-channel hopping is a "
                    f"key mule indicator."
                )
                explanation['evidence'].append({
                    'factor': 'Channel Diversity',
                    'value': f"{channels_used} channels",
                    'threshold': '>= 3 channels',
                    'risk': 'HIGH'
                })

        # ── CHECK 6: Velocity Alerts ──
        if velocity_alerts and len(velocity_alerts) > 0:
            for alert in velocity_alerts:
                explanation['risk_factors'].append(
                    f"🔴 Velocity alert: "
                    f"{alert.get('description', 'Unknown')}"
                )

        # ── CHECK 7: Community/Ring ──
        if community_info:
            explanation['risk_factors'].append(
                f"🔴 Member of suspicious community "
                f"(ring score: "
                f"{community_info.get('ring_score', 0):.3f})"
            )

        # ── Generate Recommendation ──
        num_high = len([
            f for f in explanation['risk_factors']
            if '🔴' in f
        ])

        if num_high >= 3:
            explanation['recommendation'] = (
                "IMMEDIATE BLOCK — Multiple high-risk "
                "indicators detected. This account shows "
                "strong mule characteristics. Recommend "
                "blocking all transactions and escalating "
                "to fraud investigation team."
            )
        elif num_high >= 1:
            explanation['recommendation'] = (
                "MANUAL REVIEW — Some suspicious indicators "
                "detected. Recommend placing account under "
                "enhanced monitoring and reviewing recent "
                "transaction history."
            )
        else:
            explanation['recommendation'] = (
                "MONITOR — No immediate threat detected. "
                "Continue standard monitoring."
            )

        return explanation

    def format_explanation(self, explanation):
        """Format explanation as readable text."""
        lines = []
        lines.append(f"\n{'=' * 60}")
        lines.append(f"  ACCOUNT INVESTIGATION REPORT")
        lines.append(f"  Account: {explanation['account_id']}")
        lines.append(f"{'=' * 60}")

        lines.append(f"\n  RISK FACTORS:")
        for i, factor in enumerate(
            explanation['risk_factors'], 1
        ):
            lines.append(f"  {i}. {factor}")

        if explanation['evidence']:
            lines.append(f"\n  EVIDENCE:")
            for ev in explanation['evidence']:
                lines.append(
                    f"    • {ev['factor']}: {ev['value']} "
                    f"(threshold: {ev['threshold']}, "
                    f"risk: {ev['risk']})"
                )

        lines.append(f"\n  RECOMMENDATION:")
        lines.append(f"  {explanation['recommendation']}")
        lines.append(f"{'=' * 60}")

        return '\n'.join(lines)


# ============================================================
# RUN THIS FILE TO TEST EXPLANATIONS
# ============================================================
if __name__ == "__main__":
    accounts_df = pd.read_csv('data/synthetic_accounts.csv')
    txns_df = pd.read_csv('data/synthetic_transactions.csv')

    explainer = RingCutterExplainer(accounts_df, txns_df)

    # Test with a mule account
    mule_accounts = accounts_df[
        accounts_df['is_mule'] == 1
    ]['account_id'].tolist()

    if mule_accounts:
        test_account = mule_accounts[0]
        explanation = explainer.explain_account(
            account_id=test_account,
            gnn_score=0.89,
            velocity_alerts=[
                {
                    'severity': 'HIGH',
                    'description':
                        '4 channels used in 18 minutes'
                }
            ]
        )
        print(explainer.format_explanation(explanation))

    # Test with a normal account
    normal_accounts = accounts_df[
        accounts_df['is_mule'] == 0
    ]['account_id'].tolist()

    if normal_accounts:
        test_account = normal_accounts[0]
        explanation = explainer.explain_account(
            account_id=test_account,
            gnn_score=0.08
        )
        print(explainer.format_explanation(explanation))

    print("\n✅ Explainer Working!")