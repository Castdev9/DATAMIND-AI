export type AgentType = 
  | 'supervisor'
  | 'understanding'
  | 'cleaning'
  | 'eda'
  | 'visualization'
  | 'statistical'
  | 'machine_learning'
  | 'insight'
  | 'report'
  | 'dashboard';

export interface AgentInfo {
  id: AgentType;
  name: string;
  role: string;
  icon: string;
  color: string;
  description: string;
}

export interface AgentStep {
  agent: AgentType;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  outputDetails?: string;
  timestamp?: string;
}

export interface ColumnMeta {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'date';
  nullCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  sampleValues: any[];
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnMeta[];
  data: Record<string, any>[];
  dataQualityScore: number; // 0 to 100
  createdAt: string;
  sourceType: 'csv' | 'excel' | 'json' | 'postgresql' | 'snowflake' | 'sheets' | 'sample';
}

export interface ChartConfig {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'scatter' | 'heatmap' | 'donut' | 'area' | 'histogram';
  xAxis: string;
  yAxis: string;
  groupBy?: string;
  description?: string;
  data: Record<string, any>[];
  colors?: string[];
}

export interface StatResult {
  testName: string;
  statistic: string;
  pValue: string;
  interpretation: string;
  significance: boolean;
  details?: Record<string, any>;
}

export interface MLMetric {
  name: string;
  value: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface FeatureShapSummary {
  feature: string;
  importance: number; // 0 - 100 percentage
  meanAbsShap: number;
  correlationWithTarget: number;
  impactDirection: 'positive' | 'negative' | 'mixed';
  sampleValues: { value: number; shapValue: number; zScore: number }[];
}

export interface InstanceShapExplanation {
  rowIndex: number;
  baseValue: number;
  predictedValue: number;
  targetActual: any;
  featureContributions: {
    feature: string;
    featureValue: any;
    shapValue: number;
    formattedShap: string;
    impact: 'positive' | 'negative';
    percentageContribution: number;
  }[];
  naturalLanguageSummary: string;
}

export interface ModelExplainabilityResult {
  modelId: string;
  modelName: string;
  algorithmFamily: string;
  targetColumn: string;
  featureColumns: string[];
  globalImportances: FeatureShapSummary[];
  sampleExplanations: InstanceShapExplanation[];
  baseValue: number;
}

export interface MLModelResult {
  modelName: string;
  taskType: 'classification' | 'regression' | 'forecasting' | 'clustering';
  targetColumn: string;
  featureColumns: string[];
  metrics: MLMetric[];
  featureImportance?: FeatureImportance[];
  predictions?: Record<string, any>[];
}

export interface InsightItem {
  id?: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  type: 'opportunity' | 'risk' | 'anomaly' | 'trend';
  metricValue?: string;
}

export interface WidgetComment {
  id: string;
  widgetId: string;
  author: string;
  role?: string;
  avatarColor?: string;
  text: string;
  createdAt: string;
  resolved?: boolean;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'kpi' | 'chart' | 'table' | 'text';
  value?: string | number;
  change?: string;
  isPositive?: boolean;
  chartConfig?: ChartConfig;
  text?: string;
  datasetId?: string;
  width?: 'full' | 'half' | 'third' | 'two-thirds';
  order?: number;
  xAxisCol?: string;
  yAxisCol?: string;
  aggregation?: 'sum' | 'mean' | 'count';
  showTrendLine?: boolean;
  trendType?: 'linear' | 'polynomial';
  comments?: WidgetComment[];
}

export interface AnalysisResult {
  summary: string;
  agentSteps: AgentStep[];
  insights: InsightItem[];
  charts: ChartConfig[];
  statistics: StatResult[];
  mlPredictions?: MLModelResult;
  code?: {
    python: string;
    sql: string;
    r?: string;
  };
  executiveReport?: string;
  dashboardWidgets?: DashboardWidget[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  agentSteps?: AgentStep[];
  resultData?: AnalysisResult;
  timestamp: string;
  datasetId?: string;
}

export interface FilterCondition {
  id: string;
  column: string;
  operator: 
    | 'equals' 
    | 'not_equals' 
    | 'contains' 
    | 'greater_than' 
    | 'less_than' 
    | 'greater_equal' 
    | 'less_equal' 
    | 'between' 
    | 'after' 
    | 'before' 
    | 'date_between' 
    | 'is_null' 
    | 'is_not_null';
  value: string;
  secondValue?: string;
}

export type TabType = 'copilot' | 'explorer' | 'visualize' | 'stat_ml' | 'reports' | 'dashboards' | 'connectors';

export interface CursorPosition {
  x: number; // percentage (0-100) or pixel
  y: number; // percentage (0-100) or pixel
  px?: number;
  py?: number;
  elementId?: string;
  activeSection?: string;
}

export interface UserPresence {
  id: string;
  name: string;
  role: string;
  color: string;
  avatarInitials: string;
  activeTab: TabType;
  cursor?: CursorPosition;
  status: 'active' | 'idle' | 'away';
  lastSeen: number;
}
