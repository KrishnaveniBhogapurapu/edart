export type SourceMode = 'MOCK' | 'API' | 'EXCEL';
export type CandleInterval = '3m' | '5m' | '15m';
export type PriceColumn = 'open' | 'high' | 'low' | 'close';
export type AggregationType = 'sum' | 'avg' | 'max' | 'min';
export type DerivedOperator = '+' | '-' | '/';
export type ConditionOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';
export type VariableValue = number | string | null;
export type NullableNumber = number | null;

export interface CandleInput {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  oi?: number;
}

export interface Candle extends CandleInput {
  variables: Record<string, VariableValue>;
}

export interface SessionConfig {
  marketStartTime: string;
  timezone: string;
  anchorRealTime?: string;
}

export interface VariableOperand {
  type: 'variable';
  name: string;
}

export interface NumericConstantOperand {
  type: 'constant';
  value: number;
}

export interface ConstantOperand {
  type: 'constant';
  value: number | string;
}

export type NumericOperand = VariableOperand | NumericConstantOperand;
export type Operand = VariableOperand | ConstantOperand;

export interface BaseVariableConfig {
  kind: 'base';
  scope: 'row';
  name: string;
  windowSize: number;
  excludeRecent?: number;
  source: PriceColumn;
  aggregation: AggregationType;
  freeze?: boolean;
}

export interface DerivedVariableConfig {
  kind: 'derived';
  scope: 'row';
  name: string;
  left: NumericOperand;
  right: NumericOperand;
  operator: DerivedOperator;
  freeze?: boolean;
}

export interface ConditionVariableConfig {
  kind: 'condition';
  scope: 'row';
  name: string;
  left: Operand;
  comparator: ConditionOperator;
  right: Operand;
  thenValue: Operand;
  elseValue: Operand;
  freeze?: boolean;
}

export interface SessionSnapshotVariableConfig {
  kind: 'session';
  scope: 'session';
  computeMode: 'once';
  name: string;
  trigger: {
    type: 'candleCountGte';
    value: number;
  };
  range: {
    startIndex: number;
    endIndex: number;
  };
  source: PriceColumn;
  aggregation: AggregationType;
}

export type VariableConfig =
  | BaseVariableConfig
  | DerivedVariableConfig
  | ConditionVariableConfig
  | SessionSnapshotVariableConfig;

export interface ApiModeConfig {
  userId?: string;
  user_id?: string;
  dateFrom?: string;
  dateTo?: string;
  instrumentToken?: string;
  tradingsymbol?: string;
  exchange?: string;
  segment?: string;
}

export interface AppWorkspaceConfig {
  mode: SourceMode;
  interval: CandleInterval;
  session: SessionConfig;
  variables: VariableConfig[];
  activeVariableCollectionId?: string | null;
  api?: ApiModeConfig;
}

export interface BaseTrace {
  type: 'base';
  usedRowIndices: number[];
  usedValues: number[];
  excludeRecent: number;
  aggregation: AggregationType;
  source: PriceColumn;
  result: NullableNumber;
  frozen?: boolean;
}

export interface DerivedTrace {
  type: 'derived';
  left: NumericOperand;
  leftValue: NullableNumber;
  operator: DerivedOperator;
  right: NumericOperand;
  rightValue: NullableNumber;
  result: NullableNumber;
  frozen?: boolean;
}

export interface ConditionTrace {
  type: 'condition';
  left: Operand;
  leftValue: VariableValue;
  comparator: ConditionOperator;
  right: Operand;
  rightValue: VariableValue;
  predicateResult: boolean | null;
  thenValue: Operand;
  elseValue: Operand;
  result: VariableValue;
  frozen?: boolean;
}

export interface SessionTrace {
  type: 'session';
  frozen: boolean;
  triggerAtCandleCount: number;
  range: { startIndex: number; endIndex: number };
  usedValues: number[];
  result: NullableNumber;
}

export type VariableTrace = BaseTrace | DerivedTrace | ConditionTrace | SessionTrace;

export interface ComputedCandle extends Candle {
  trace: Record<string, VariableTrace>;
}

export interface ComputationResult {
  rows: ComputedCandle[];
  sessionValues: Record<string, VariableValue>;
  errors: string[];
}

export interface ComputeOptions {
  candles: CandleInput[];
  variables: VariableConfig[];
}
