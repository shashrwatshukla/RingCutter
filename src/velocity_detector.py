"""
RingCutter — Velocity & Pattern Detector
PURPOSE: Detects fraud patterns based on transaction speed,
         timing, amounts, and behavioral anomalies.

Patterns Detected:
    1. Rapid Cross-Channel Hop
    2. Fan-In (many → one)
    3. Fan-Out (one → many)
    4. Structuring / Smurfing (just-below-threshold)
    5. Dormant Account Activation
"""

import pandas as pd
import numpy as np
from datetime import timedelta


class VelocityDetector:
    """
    Detects fraud patterns based on transaction velocity
    and behavioral anomalies.
    """

    def __init__(self, txns_df, accounts_df):
        self.txns_df = txns_df.copy()
        self.txns_df['timestamp'] = pd.to_datetime(
            self.txns_df['timestamp']
        )
        self.accounts_df = accounts_df.copy()
        self.alerts = []

    def detect_rapid_cross_channel(
        self, time_window_minutes=30, min_channels=3
    ):
        """
        PATTERN 1: Rapid Cross-Channel Hop

        Detects when an account uses 3+ different channels
        within 30 minutes.

        Example:
            10:00 — Received ₹45,000 via UPI
            10:05 — Transferred ₹44,000 via Mobile App
            10:12 — Moved ₹43,500 to Wallet
            10:18 — Withdrew ₹43,000 at ATM
            → 4 channels in 18 minutes = 🔴 ALERT
        """
        print("  Checking: Rapid Cross-Channel Hops...")
        alerts = []

        for account, group in self.txns_df.groupby(
            'from_account'
        ):
            group = group.sort_values('timestamp')

            for i in range(len(group)):
                window_start = group.iloc[i]['timestamp']
                window_end = window_start + timedelta(
                    minutes=time_window_minutes
                )

                window_txns = group[
                    (group['timestamp'] >= window_start) &
                    (group['timestamp'] <= window_end)
                ]

                unique_channels = window_txns[
                    'channel'
                ].nunique()

                if unique_channels >= min_channels:
                    channel_seq = ' → '.join(
                        window_txns['channel'].tolist()
                    )
                    total_amount = window_txns['amount'].sum()

                    alerts.append({
                        'account_id': account,
                        'pattern': 'RAPID_CROSS_CHANNEL',
                        'severity': 'HIGH',
                        'channels_used': unique_channels,
                        'channel_sequence': channel_seq,
                        'total_amount': total_amount,
                        'time_window_minutes': (
                            window_txns['timestamp'].max() -
                            window_txns['timestamp'].min()
                        ).total_seconds() / 60,
                        'txn_count': len(window_txns),
                        'timestamp': str(window_start),
                        'description': (
                            f"Account used {unique_channels} "
                            f"channels in "
                            f"{time_window_minutes} min: "
                            f"{channel_seq}"
                        )
                    })
                    break  # One alert per account is enough

        print(f"    Found {len(alerts)} rapid "
              f"cross-channel alerts")
        self.alerts.extend(alerts)
        return alerts

    def detect_fan_in(
        self, time_window_minutes=60, min_senders=4
    ):
        """
        PATTERN 2: Fan-In

        Detects when 4+ different accounts send money to
        ONE account within 60 minutes.

        This identifies "collector" mule accounts.
        """
        print("  Checking: Fan-In patterns...")
        alerts = []

        for account, group in self.txns_df.groupby(
            'to_account'
        ):
            group = group.sort_values('timestamp')

            for i in range(len(group)):
                window_start = group.iloc[i]['timestamp']
                window_end = window_start + timedelta(
                    minutes=time_window_minutes
                )

                window_txns = group[
                    (group['timestamp'] >= window_start) &
                    (group['timestamp'] <= window_end)
                ]

                unique_senders = window_txns[
                    'from_account'
                ].nunique()

                if unique_senders >= min_senders:
                    total_amount = window_txns['amount'].sum()

                    alerts.append({
                        'account_id': account,
                        'pattern': 'FAN_IN',
                        'severity': 'HIGH',
                        'unique_senders': unique_senders,
                        'total_amount': total_amount,
                        'time_window_minutes': (
                            window_txns['timestamp'].max() -
                            window_txns['timestamp'].min()
                        ).total_seconds() / 60,
                        'txn_count': len(window_txns),
                        'timestamp': str(window_start),
                        'description': (
                            f"{unique_senders} accounts sent "
                            f"₹{total_amount:,.0f} to this "
                            f"account in "
                            f"{time_window_minutes} min"
                        )
                    })
                    break

        print(f"    Found {len(alerts)} fan-in alerts")
        self.alerts.extend(alerts)
        return alerts

    def detect_fan_out(
        self, time_window_minutes=60, min_receivers=4
    ):
        """
        PATTERN 3: Fan-Out

        Detects when ONE account sends to 4+ different
        accounts within 60 minutes.

        This identifies "distributor" mule accounts.
        """
        print("  Checking: Fan-Out patterns...")
        alerts = []

        for account, group in self.txns_df.groupby(
            'from_account'
        ):
            group = group.sort_values('timestamp')

            for i in range(len(group)):
                window_start = group.iloc[i]['timestamp']
                window_end = window_start + timedelta(
                    minutes=time_window_minutes
                )

                window_txns = group[
                    (group['timestamp'] >= window_start) &
                    (group['timestamp'] <= window_end)
                ]

                unique_receivers = window_txns[
                    'to_account'
                ].nunique()

                if unique_receivers >= min_receivers:
                    total_amount = window_txns['amount'].sum()

                    alerts.append({
                        'account_id': account,
                        'pattern': 'FAN_OUT',
                        'severity': 'HIGH',
                        'unique_receivers': unique_receivers,
                        'total_amount': total_amount,
                        'time_window_minutes': (
                            window_txns['timestamp'].max() -
                            window_txns['timestamp'].min()
                        ).total_seconds() / 60,
                        'txn_count': len(window_txns),
                        'timestamp': str(window_start),
                        'description': (
                            f"Account sent "
                            f"₹{total_amount:,.0f} to "
                            f"{unique_receivers} accounts "
                            f"in {time_window_minutes} min"
                        )
                    })
                    break

        print(f"    Found {len(alerts)} fan-out alerts")
        self.alerts.extend(alerts)
        return alerts

    def detect_structuring(
        self, threshold=50000, tolerance=5000,
        min_count=3
    ):
        """
        PATTERN 4: Structuring (Smurfing)

        Detects 3+ transactions with amounts just below
        the ₹50,000 reporting threshold.

        Example:
            ₹49,500, ₹48,800, ₹49,900
            → All just below ₹50K = 🔴 STRUCTURING
        """
        print("  Checking: Structuring/Smurfing...")
        alerts = []

        for account, group in self.txns_df.groupby(
            'from_account'
        ):
            suspicious = group[
                (group['amount'] >= threshold - tolerance) &
                (group['amount'] < threshold)
            ]

            if len(suspicious) >= min_count:
                amounts = suspicious['amount'].tolist()

                alerts.append({
                    'account_id': account,
                    'pattern': 'STRUCTURING',
                    'severity': 'MEDIUM',
                    'txn_count': len(suspicious),
                    'amounts': str(amounts[:5]),
                    'total_amount': suspicious['amount'].sum(),
                    'avg_amount': suspicious['amount'].mean(),
                    'timestamp': str(
                        suspicious['timestamp'].min()
                    ),
                    'description': (
                        f"{len(suspicious)} transactions "
                        f"between "
                        f"₹{threshold - tolerance:,} and "
                        f"₹{threshold:,} "
                        f"(avg: ₹{suspicious['amount'].mean():,.0f})"
                    )
                })

        print(f"    Found {len(alerts)} structuring alerts")
        self.alerts.extend(alerts)
        return alerts

    def detect_dormant_activation(
        self, dormancy_days=90, burst_count=5,
        burst_window_hours=24
    ):
        """
        PATTERN 5: Dormant Account Activation

        Detects accounts with no activity for 90+ days
        that suddenly have 5+ transactions in 24 hours.
        """
        print("  Checking: Dormant Account Activation...")
        alerts = []

        for account, group in self.txns_df.groupby(
            'from_account'
        ):
            group = group.sort_values('timestamp')
            if len(group) < 2:
                continue

            group = group.copy()
            group['time_diff'] = group['timestamp'].diff()

            dormant_periods = group[
                group['time_diff'] > timedelta(
                    days=dormancy_days
                )
            ]

            for _, dormant_row in dormant_periods.iterrows():
                burst_start = dormant_row['timestamp']
                burst_end = burst_start + timedelta(
                    hours=burst_window_hours
                )

                burst_txns = group[
                    (group['timestamp'] >= burst_start) &
                    (group['timestamp'] <= burst_end)
                ]

                if len(burst_txns) >= burst_count:
                    alerts.append({
                        'account_id': account,
                        'pattern': 'DORMANT_ACTIVATION',
                        'severity': 'MEDIUM',
                        'dormancy_days': (
                            dormant_row['time_diff'].days
                        ),
                        'burst_txn_count': len(burst_txns),
                        'burst_amount': (
                            burst_txns['amount'].sum()
                        ),
                        'timestamp': str(burst_start),
                        'description': (
                            f"Account dormant for "
                            f"{dormant_row['time_diff'].days} "
                            f"days, then {len(burst_txns)} "
                            f"transactions in "
                            f"{burst_window_hours} hours"
                        )
                    })

        print(f"    Found {len(alerts)} dormant "
              f"activation alerts")
        self.alerts.extend(alerts)
        return alerts

    def run_all_detections(self):
        """Run ALL pattern detections and return alerts."""
        print("\n" + "=" * 60)
        print("  RINGCUTTER — Velocity & Pattern Detector")
        print("=" * 60)

        self.detect_rapid_cross_channel()
        self.detect_fan_in()
        self.detect_fan_out()
        self.detect_structuring()
        self.detect_dormant_activation()

        alerts_df = pd.DataFrame(self.alerts)

        print("\n" + "=" * 60)
        print(f"  TOTAL ALERTS: {len(self.alerts)}")
        if len(alerts_df) > 0:
            print(f"  By Pattern:")
            for pattern, count in alerts_df[
                'pattern'
            ].value_counts().items():
                print(f"    {pattern}: {count}")
            print(f"  By Severity:")
            for severity, count in alerts_df[
                'severity'
            ].value_counts().items():
                print(f"    {severity}: {count}")
        print("=" * 60)

        return alerts_df


# ============================================================
# RUN THIS FILE TO DETECT PATTERNS
# ============================================================
if __name__ == "__main__":
    txns_df = pd.read_csv('data/synthetic_transactions.csv')
    accounts_df = pd.read_csv('data/synthetic_accounts.csv')

    detector = VelocityDetector(txns_df, accounts_df)
    alerts_df = detector.run_all_detections()

    if len(alerts_df) > 0:
        alerts_df.to_csv(
            'data/velocity_alerts.csv', index=False
        )
        print("\nAlerts saved to data/velocity_alerts.csv ✅")