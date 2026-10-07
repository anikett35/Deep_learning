export interface PredictionResponse {
  predicted_class: string;
  predicted_index: number;
  confidence: number;
  probabilities: Record<string, number>;
  latency_ms?: number;
  query_id?: string;
}

export interface SystemStatusResponse {
  status: string;
  apiOnline: boolean;
  totalQueries: number;
  dbOnline: boolean;
  savedAuditsCount: number;
  timestamp: string;
}
