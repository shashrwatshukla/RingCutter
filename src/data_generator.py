"""
RingCutter — Synthetic Data Generator
PURPOSE: Creates realistic fake banking data for training and testing.
         Generates accounts, transactions, and mule ring patterns.
"""

import pandas as pd
import numpy as np
from faker import Faker
import random
from datetime import datetime, timedelta
import os
import uuid


# Initialize Faker with Indian locale for realistic Indian data
fake = Faker('en_IN')

# Set random seeds so results are reproducible every time
np.random.seed(42)
random.seed(42)


# ============================================================
# CONFIGURATION — Change these numbers to adjust data size
# ============================================================
NUM_NORMAL_ACCOUNTS = 4800
NUM_MULE_ACCOUNTS = 200
NUM_NORMAL_TRANSACTIONS = 48000
NUM_MULE_TRANSACTIONS = 2000
NUM_MULE_RINGS = 18
CHANNELS = ['UPI', 'MOBILE_APP', 'WEB_BANKING', 'ATM', 'WALLET']

CITIES = [
    'Chennai', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
    'Kochi', 'Coimbatore', 'Vizag', 'Bhopal', 'Chandigarh'
]

# Approximate latitude/longitude for each city
CITY_COORDS = {
    'Chennai': (13.08, 80.27),
    'Mumbai': (19.07, 72.87),
    'Delhi': (28.70, 77.10),
    'Bangalore': (12.97, 77.59),
    'Hyderabad': (17.38, 78.49),
    'Kolkata': (22.57, 88.36),
    'Pune': (18.52, 73.85),
    'Ahmedabad': (23.02, 72.57),
    'Jaipur': (26.91, 75.78),
    'Lucknow': (26.85, 80.95),
    'Kochi': (9.93, 76.26),
    'Coimbatore': (11.00, 76.96),
    'Vizag': (17.69, 83.22),
    'Bhopal': (23.26, 77.41),
    'Chandigarh': (30.73, 76.77)
}


def generate_account_id():
    """Generate a realistic Indian bank account number."""
    return f"IB{random.randint(1000000000, 9999999999)}"


def generate_device_id():
    """Generate a unique device identifier."""
    return f"DEV_{uuid.uuid4().hex[:8].upper()}"


def generate_accounts():
    """
    Generate both normal and mule bank accounts.

    Normal accounts:
        - Older accounts (1-10 years)
        - Higher balances
        - Full KYC completed
        - Each uses their own unique device

    Mule accounts:
        - Newer accounts (1-12 months)
        - Lower balances
        - Often minimum KYC
        - Some share devices within the same ring (KEY SIGNAL)
        - Grouped into rings of connected accounts
    """
    print("Generating accounts...")
    accounts = []

    # ──────────────────────────────────────────
    # GENERATE NORMAL (LEGITIMATE) ACCOUNTS
    # ──────────────────────────────────────────
    for i in range(NUM_NORMAL_ACCOUNTS):
        city = random.choice(CITIES)
        lat, lon = CITY_COORDS[city]

        account = {
            'account_id': generate_account_id(),
            'customer_name': fake.name(),
            'age': random.randint(21, 70),
            'city': city,
            'latitude': lat + random.uniform(-0.1, 0.1),
            'longitude': lon + random.uniform(-0.1, 0.1),
            'account_age_days': random.randint(365, 3650),
            'avg_monthly_balance': random.randint(5000, 500000),
            'account_type': random.choice(
                ['SAVINGS', 'SAVINGS', 'SAVINGS', 'CURRENT']
            ),
            'kyc_status': 'FULL_KYC',
            'is_mule': 0,
            'mule_ring_id': -1,
            'primary_device_id': generate_device_id(),
            'phone_number': fake.phone_number(),
            'email': fake.email(),
            'pan_number': fake.bothify('?????####?').upper(),
            'created_date': fake.date_between(
                start_date='-10y', end_date='-1y'
            ).isoformat()
        }
        accounts.append(account)

    # ──────────────────────────────────────────
    # GENERATE MULE (FRAUDULENT) ACCOUNTS
    # ──────────────────────────────────────────
    mule_accounts_per_ring = NUM_MULE_ACCOUNTS // NUM_MULE_RINGS

    for ring_id in range(NUM_MULE_RINGS):
        # Each ring operates across 2-3 cities
        ring_cities = random.sample(CITIES, k=random.randint(2, 3))

        # KEY FEATURE: Some mules in a ring SHARE devices
        # This is a strong signal for detection
        shared_devices = [
            generate_device_id()
            for _ in range(random.randint(1, 3))
        ]

        for j in range(mule_accounts_per_ring):
            city = random.choice(ring_cities)
            lat, lon = CITY_COORDS[city]

            account = {
                'account_id': generate_account_id(),
                'customer_name': fake.name(),
                'age': random.randint(19, 35),
                'city': city,
                'latitude': lat + random.uniform(-0.05, 0.05),
                'longitude': lon + random.uniform(-0.05, 0.05),
                'account_age_days': random.randint(30, 365),
                'avg_monthly_balance': random.randint(500, 10000),
                'account_type': 'SAVINGS',
                'kyc_status': random.choice(
                    ['FULL_KYC', 'MIN_KYC', 'MIN_KYC']
                ),
                'is_mule': 1,
                'mule_ring_id': ring_id,
                'primary_device_id': random.choice(
                    shared_devices + [generate_device_id()]
                ),
                'phone_number': fake.phone_number(),
                'email': fake.email(),
                'pan_number': fake.bothify('?????####?').upper(),
                'created_date': fake.date_between(
                    start_date='-1y', end_date='-30d'
                ).isoformat()
            }
            accounts.append(account)

    df = pd.DataFrame(accounts)
    print(f"  Generated {len(df)} accounts "
          f"({NUM_NORMAL_ACCOUNTS} normal + "
          f"{NUM_MULE_ACCOUNTS} mule in "
          f"{NUM_MULE_RINGS} rings)")
    return df


def generate_normal_transactions(accounts_df):
    """
    Generate normal (legitimate) transactions.

    Normal transaction patterns:
        - Varied amounts but reasonable
        - Spread over weeks/months
        - Mostly within the same city
        - Uses 1-2 channels consistently
        - Regular timing (daytime hours)
    """
    print("Generating normal transactions...")
    normal_accounts = accounts_df[
        accounts_df['is_mule'] == 0
    ]['account_id'].tolist()

    transactions = []
    start_date = datetime(2026, 1, 1)
    end_date = datetime(2026, 3, 15)

    for i in range(NUM_NORMAL_TRANSACTIONS):
        sender = random.choice(normal_accounts)
        receiver = random.choice(normal_accounts)

        # Make sure sender and receiver are different
        while receiver == sender:
            receiver = random.choice(normal_accounts)

        timestamp = fake.date_time_between(
            start_date=start_date, end_date=end_date
        )
        channel = random.choice(CHANNELS)

        # Amount depends on channel
        if channel == 'ATM':
            amount = random.choice(
                [500, 1000, 2000, 5000, 10000, 20000]
            )
        elif channel == 'UPI':
            amount = random.randint(50, 25000)
        else:
            amount = random.randint(100, 100000)

        # Get sender's data for location/device info
        sender_data = accounts_df[
            accounts_df['account_id'] == sender
        ].iloc[0]

        txn = {
            'txn_id': f"TXN_{uuid.uuid4().hex[:12].upper()}",
            'from_account': sender,
            'to_account': receiver,
            'amount': amount,
            'channel': channel,
            'timestamp': timestamp.isoformat(),
            'date': timestamp.date().isoformat(),
            'hour': timestamp.hour,
            'device_id': sender_data['primary_device_id'],
            'ip_address': fake.ipv4(),
            'geo_lat': sender_data['latitude'] + random.uniform(
                -0.02, 0.02
            ),
            'geo_lon': sender_data['longitude'] + random.uniform(
                -0.02, 0.02
            ),
            'city': sender_data['city'],
            'txn_type': random.choice(
                ['P2P', 'BILL_PAYMENT', 'SHOPPING',
                 'SALARY', 'WITHDRAWAL']
            ),
            'status': 'SUCCESS',
            'is_fraud': 0,
            'mule_ring_id': -1
        }
        transactions.append(txn)

    print(f"  Generated {len(transactions)} normal transactions")
    return transactions


def generate_mule_transactions(accounts_df):
    """
    Generate MULE (fraudulent) transactions.

    Mule patterns (these are what RingCutter detects):

    PATTERN 1 — RAPID CROSS-CHANNEL CHAIN:
        UPI_IN → APP_TRANSFER → WALLET_MOVE → ATM_OUT
        All within 30 minutes

    PATTERN 2 — FAN-IN:
        5+ accounts → 1 account in < 1 hour

    PATTERN 3 — FAN-OUT:
        1 account → 5+ accounts in < 1 hour

    PATTERN 4 — ROUND-TRIP (LAYERING):
        A → B → C → D → A (money goes in circle)

    PATTERN 5 — STRUCTURING (SMURFING):
        Multiple transactions just below ₹50,000 threshold
    """
    print("Generating mule transactions...")
    mule_accounts = accounts_df[accounts_df['is_mule'] == 1]
    transactions = []

    base_time = datetime(2026, 3, 10, 10, 0, 0)

    for ring_id in range(NUM_MULE_RINGS):
        ring_accounts = mule_accounts[
            mule_accounts['mule_ring_id'] == ring_id
        ]['account_id'].tolist()

        if len(ring_accounts) < 3:
            continue

        ring_start_time = base_time + timedelta(
            hours=random.randint(0, 72)
        )

        # ──── PATTERN 1: RAPID CROSS-CHANNEL CHAIN ────
        for chain_num in range(8):
            chain_time = ring_start_time + timedelta(
                hours=random.randint(0, 48)
            )
            chain_accounts = random.sample(
                ring_accounts,
                k=min(random.randint(3, 6), len(ring_accounts))
            )
            channel_sequence = [
                'UPI', 'MOBILE_APP', 'WALLET', 'ATM'
            ]

            for step in range(len(chain_accounts) - 1):
                chain_time += timedelta(
                    minutes=random.randint(2, 8)
                )
                channel = channel_sequence[
                    step % len(channel_sequence)
                ]
                sender_data = accounts_df[
                    accounts_df['account_id'] == chain_accounts[step]
                ].iloc[0]
                amount = random.randint(15000, 48000)

                txn = {
                    'txn_id': f"TXN_{uuid.uuid4().hex[:12].upper()}",
                    'from_account': chain_accounts[step],
                    'to_account': chain_accounts[step + 1],
                    'amount': amount,
                    'channel': channel,
                    'timestamp': chain_time.isoformat(),
                    'date': chain_time.date().isoformat(),
                    'hour': chain_time.hour,
                    'device_id': sender_data['primary_device_id'],
                    'ip_address': fake.ipv4(),
                    'geo_lat': sender_data['latitude'],
                    'geo_lon': sender_data['longitude'],
                    'city': sender_data['city'],
                    'txn_type': 'P2P',
                    'status': 'SUCCESS',
                    'is_fraud': 1,
                    'mule_ring_id': ring_id
                }
                transactions.append(txn)

        # ──── PATTERN 2: FAN-IN ────
        collector = random.choice(ring_accounts)
        fan_in_time = ring_start_time + timedelta(hours=5)
        senders = [
            a for a in ring_accounts if a != collector
        ][:5]

        for sender in senders:
            fan_in_time += timedelta(
                minutes=random.randint(1, 5)
            )
            sender_data = accounts_df[
                accounts_df['account_id'] == sender
            ].iloc[0]

            txn = {
                'txn_id': f"TXN_{uuid.uuid4().hex[:12].upper()}",
                'from_account': sender,
                'to_account': collector,
                'amount': random.randint(20000, 49000),
                'channel': 'UPI',
                'timestamp': fan_in_time.isoformat(),
                'date': fan_in_time.date().isoformat(),
                'hour': fan_in_time.hour,
                'device_id': sender_data['primary_device_id'],
                'ip_address': fake.ipv4(),
                'geo_lat': sender_data['latitude'],
                'geo_lon': sender_data['longitude'],
                'city': sender_data['city'],
                'txn_type': 'P2P',
                'status': 'SUCCESS',
                'is_fraud': 1,
                'mule_ring_id': ring_id
            }
            transactions.append(txn)

        # ──── PATTERN 3: FAN-OUT ────
        distributor = random.choice(ring_accounts)
        fan_out_time = ring_start_time + timedelta(hours=8)
        receivers = [
            a for a in ring_accounts if a != distributor
        ][:5]

        for receiver in receivers:
            fan_out_time += timedelta(
                minutes=random.randint(1, 5)
            )
            dist_data = accounts_df[
                accounts_df['account_id'] == distributor
            ].iloc[0]

            txn = {
                'txn_id': f"TXN_{uuid.uuid4().hex[:12].upper()}",
                'from_account': distributor,
                'to_account': receiver,
                'amount': random.randint(20000, 49000),
                'channel': 'MOBILE_APP',
                'timestamp': fan_out_time.isoformat(),
                'date': fan_out_time.date().isoformat(),
                'hour': fan_out_time.hour,
                'device_id': dist_data['primary_device_id'],
                'ip_address': fake.ipv4(),
                'geo_lat': dist_data['latitude'],
                'geo_lon': dist_data['longitude'],
                'city': dist_data['city'],
                'txn_type': 'P2P',
                'status': 'SUCCESS',
                'is_fraud': 1,
                'mule_ring_id': ring_id
            }
            transactions.append(txn)

        # ──── PATTERN 4: ROUND-TRIP (LAYERING) ────
        circle_time = ring_start_time + timedelta(hours=12)
        circle_accounts = random.sample(
            ring_accounts,
            k=min(4, len(ring_accounts))
        )

        for idx in range(len(circle_accounts)):
            circle_time += timedelta(
                minutes=random.randint(3, 10)
            )
            sender_idx = idx
            receiver_idx = (idx + 1) % len(circle_accounts)
            s_data = accounts_df[
                accounts_df['account_id'] == circle_accounts[sender_idx]
            ].iloc[0]

            txn = {
                'txn_id': f"TXN_{uuid.uuid4().hex[:12].upper()}",
                'from_account': circle_accounts[sender_idx],
                'to_account': circle_accounts[receiver_idx],
                'amount': random.randint(30000, 45000),
                'channel': random.choice(CHANNELS),
                'timestamp': circle_time.isoformat(),
                'date': circle_time.date().isoformat(),
                'hour': circle_time.hour,
                'device_id': s_data['primary_device_id'],
                'ip_address': fake.ipv4(),
                'geo_lat': s_data['latitude'],
                'geo_lon': s_data['longitude'],
                'city': s_data['city'],
                'txn_type': 'P2P',
                'status': 'SUCCESS',
                'is_fraud': 1,
                'mule_ring_id': ring_id
            }
            transactions.append(txn)

        # ──── PATTERN 5: STRUCTURING (SMURFING) ────
        smurf_time = ring_start_time + timedelta(hours=15)
        smurfer = random.choice(ring_accounts)
        smurfer_data = accounts_df[
            accounts_df['account_id'] == smurfer
        ].iloc[0]

        for _ in range(6):
            smurf_time += timedelta(
                minutes=random.randint(5, 15)
            )

            txn = {
                'txn_id': f"TXN_{uuid.uuid4().hex[:12].upper()}",
                'from_account': smurfer,
                'to_account': random.choice(
                    [a for a in ring_accounts if a != smurfer]
                ),
                'amount': random.randint(45000, 49900),
                'channel': 'UPI',
                'timestamp': smurf_time.isoformat(),
                'date': smurf_time.date().isoformat(),
                'hour': smurf_time.hour,
                'device_id': smurfer_data['primary_device_id'],
                'ip_address': fake.ipv4(),
                'geo_lat': smurfer_data['latitude'],
                'geo_lon': smurfer_data['longitude'],
                'city': smurfer_data['city'],
                'txn_type': 'P2P',
                'status': 'SUCCESS',
                'is_fraud': 1,
                'mule_ring_id': ring_id
            }
            transactions.append(txn)

    print(f"  Generated {len(transactions)} mule transactions "
          f"across {NUM_MULE_RINGS} rings")
    return transactions


def generate_all_data():
    """Master function: generates ALL data and saves to CSV files."""

    print("=" * 60)
    print("  RINGCUTTER — Synthetic Data Generator")
    print("=" * 60)

    # Step 1: Generate accounts
    accounts_df = generate_accounts()

    # Step 2: Generate transactions
    normal_txns = generate_normal_transactions(accounts_df)
    mule_txns = generate_mule_transactions(accounts_df)

    # Step 3: Combine all transactions
    all_txns = normal_txns + mule_txns
    txns_df = pd.DataFrame(all_txns)

    # Step 4: Shuffle so mule transactions are mixed in
    txns_df = txns_df.sample(
        frac=1, random_state=42
    ).reset_index(drop=True)

    # Step 5: Sort by timestamp (chronological order)
    txns_df['timestamp'] = pd.to_datetime(txns_df['timestamp'])
    txns_df = txns_df.sort_values('timestamp').reset_index(
        drop=True
    )

    # Step 6: Save to CSV files
    os.makedirs('data', exist_ok=True)
    accounts_df.to_csv('data/synthetic_accounts.csv', index=False)
    txns_df.to_csv('data/synthetic_transactions.csv', index=False)

    # Step 7: Print summary
    print("\n" + "=" * 60)
    print("  DATA GENERATION COMPLETE")
    print("=" * 60)
    print(f"  Accounts: {len(accounts_df)}")
    print(f"    Normal: "
          f"{len(accounts_df[accounts_df['is_mule'] == 0])}")
    print(f"    Mule:   "
          f"{len(accounts_df[accounts_df['is_mule'] == 1])}")
    print(f"    Rings:  {NUM_MULE_RINGS}")
    print(f"  Transactions: {len(txns_df)}")
    print(f"    Normal: "
          f"{len(txns_df[txns_df['is_fraud'] == 0])}")
    print(f"    Fraud:  "
          f"{len(txns_df[txns_df['is_fraud'] == 1])}")
    print(f"\n  Files saved:")
    print(f"    data/synthetic_accounts.csv")
    print(f"    data/synthetic_transactions.csv")
    print("=" * 60)

    return accounts_df, txns_df


# ============================================================
# RUN THIS FILE TO GENERATE DATA
# ============================================================
if __name__ == "__main__":
    accounts_df, txns_df = generate_all_data()