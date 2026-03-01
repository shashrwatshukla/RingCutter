import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export interface Overview {
  total_accounts: number
  total_transactions: number
  mule_accounts: number
  fraud_transactions: number
  mule_rings: number
  total_alerts: number
  auto_blocked: number
  high_risk: number
  medium_risk: number
  low_risk: number
  detection_speed: string
  model: string
  f1_score: number
  precision: number
  recall: number
}

export interface Transaction {
  txn_id: string
  from_account: string
  to_account: string
  amount: number
  channel: string
  timestamp: string
  hour: number
  city: string
  is_fraud: number
  mule_ring_id: number
}

export interface Alert {
  account_id: string
  pattern: string
  severity: string
  description: string
  timestamp: string
  total_amount: number
  txn_count: number
}

export interface GraphNode {
  id: string
  label: string
  is_mule: boolean
  ring_id: number
  city: string
  size: number
}

export interface GraphEdge {
  source: string
  target: string
  amount: number
  channel: string
  is_fraud: boolean
}

export interface Ring {
  community_id: number
  size: number
  members: string[]
  density: number
  actual_mules: number
  mule_ratio: number
  ring_score: number
  avg_account_age: number
  fraud_edge_ratio: number
}

export interface AccountDetail {
  account_id: string
  customer_name: string
  age: number
  city: string
  account_age_days: number
  avg_monthly_balance: number
  account_type: string
  kyc_status: string
  is_mule: number
  mule_ring_id: number
  transactions: Transaction[]
  transaction_count: number
  risk: {
    gnn_score: number
    velocity_score: number
    community_score: number
    final_score: number
    risk_level: string
    action: string
  }
}

export interface ComplianceItem {
  requirement: string
  feature: string
  status: string
  detail: string
}

export const api = {
  getOverview: () => API.get<Overview>('/overview'),
  getTransactions: (params?: Record<string, unknown>) =>
    API.get('/transactions', { params }),
  getDailyVolume: () => API.get('/transactions/daily'),
  getChannels: () => API.get('/transactions/channels'),
  getHeatmap: () => API.get('/transactions/heatmap'),
  getGraph: (maxNodes?: number) =>
    API.get('/graph', { params: { max_nodes: maxNodes || 150 } }),
  getAlerts: (params?: Record<string, unknown>) =>
    API.get('/alerts', { params }),
  getRings: () => API.get('/rings'),
  getSankey: () => API.get('/sankey'),
  getAccount: (id: string) =>
    API.get<AccountDetail>(`/account/${id}`),
  getCompliance: () => API.get('/compliance'),
  getAccountsList: () => API.get('/accounts/list'),
  blockAccount: (id: string) =>
    API.post(`/account/${id}/block`),
  unblockAccount: (id: string) =>
    API.post(`/account/${id}/unblock`),
}