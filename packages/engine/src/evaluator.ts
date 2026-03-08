import {
  BaseTrace,
  BaseVariableConfig,
  ComputedCandle,
  ConditionTrace,
  ConditionVariableConfig,
  DerivedTrace,
  DerivedVariableConfig,
  NullableNumber,
  Operand,
  SessionSnapshotVariableConfig,
  SessionTrace,
  VariableValue,
} from './types.js';
import { aggregate, safeDivide, toFixedOrNull } from './helpers.js';

export function evaluateBaseVariable(
  variable: BaseVariableConfig,
  rowIndex: number,
  rows: ComputedCandle[],
): { value: NullableNumber; trace: BaseTrace } {
  const excludeRecent = variable.excludeRecent ?? 1;
  const minRequiredRowIndex = excludeRecent + variable.windowSize - 1;
  if (rowIndex < minRequiredRowIndex) {
    return {
      value: null,
      trace: {
        type: 'base',
        usedRowIndices: [],
        usedValues: [],
        excludeRecent,
        aggregation: variable.aggregation,
        source: variable.source,
        result: null,
      },
    };
  }

  const usedRowIndices: number[] = [];
  const usedValues: number[] = [];

  for (let offset = 0; offset < variable.windowSize; offset += 1) {
    const sourceIndex = rowIndex - excludeRecent - offset;
    if (sourceIndex < 0 || !rows[sourceIndex]) {
      return {
        value: null,
        trace: {
          type: 'base',
          usedRowIndices: [],
          usedValues: [],
          excludeRecent,
          aggregation: variable.aggregation,
          source: variable.source,
          result: null,
        },
      };
    }
    usedRowIndices.push(sourceIndex);
    usedValues.push(rows[sourceIndex][variable.source]);
  }

  const value = toFixedOrNull(aggregate(usedValues, variable.aggregation));

  return {
    value,
    trace: {
      type: 'base',
      usedRowIndices,
      usedValues,
      excludeRecent,
      aggregation: variable.aggregation,
      source: variable.source,
      result: value,
    },
  };
}

function resolveOperand(
  operand: Operand,
  currentRowVariables: Record<string, VariableValue>,
  sessionValues: Record<string, VariableValue>,
): VariableValue {
  if (operand.type === 'constant') {
    return operand.value;
  }

  if (operand.name in currentRowVariables) {
    return currentRowVariables[operand.name] ?? null;
  }

  if (operand.name in sessionValues) {
    return sessionValues[operand.name] ?? null;
  }

  return null;
}

function resolveNumericOperand(
  operand: Operand,
  currentRowVariables: Record<string, VariableValue>,
  sessionValues: Record<string, VariableValue>,
): NullableNumber {
  const value = resolveOperand(operand, currentRowVariables, sessionValues);
  return typeof value === 'number' ? value : null;
}

export function evaluateDerivedVariable(
  variable: DerivedVariableConfig,
  currentRowVariables: Record<string, VariableValue>,
  sessionValues: Record<string, VariableValue>,
): { value: NullableNumber; trace: DerivedTrace } {
  const leftValue = resolveNumericOperand(variable.left, currentRowVariables, sessionValues);
  const rightValue = resolveNumericOperand(variable.right, currentRowVariables, sessionValues);

  let value: NullableNumber = null;

  if (leftValue !== null && rightValue !== null) {
    if (variable.operator === '+') {
      value = toFixedOrNull(leftValue + rightValue);
    } else if (variable.operator === '-') {
      value = toFixedOrNull(leftValue - rightValue);
    } else if (variable.operator === '/') {
      value = toFixedOrNull(safeDivide(leftValue, rightValue));
    }
  }

  return {
    value,
    trace: {
      type: 'derived',
      left: variable.left,
      leftValue,
      operator: variable.operator,
      right: variable.right,
      rightValue,
      result: value,
    },
  };
}

function compareValues(left: VariableValue, right: VariableValue, comparator: ConditionVariableConfig['comparator']): boolean | null {
  if (left === null || right === null) {
    return null;
  }

  if (comparator === '==') {
    return left === right;
  }

  if (comparator === '!=') {
    return left !== right;
  }

  if (typeof left !== 'number' || typeof right !== 'number') {
    return null;
  }

  switch (comparator) {
    case '>':
      return left > right;
    case '<':
      return left < right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
    default:
      return null;
  }
}

export function evaluateConditionVariable(
  variable: ConditionVariableConfig,
  currentRowVariables: Record<string, VariableValue>,
  sessionValues: Record<string, VariableValue>,
): { value: VariableValue; trace: ConditionTrace } {
  const leftValue = resolveOperand(variable.left, currentRowVariables, sessionValues);
  const rightValue = resolveOperand(variable.right, currentRowVariables, sessionValues);
  const predicateResult = compareValues(leftValue, rightValue, variable.comparator);

  let value: VariableValue = null;
  if (predicateResult !== null) {
    const outputOperand = predicateResult ? variable.thenValue : variable.elseValue;
    value = resolveOperand(outputOperand, currentRowVariables, sessionValues);
  }

  return {
    value,
    trace: {
      type: 'condition',
      left: variable.left,
      leftValue,
      comparator: variable.comparator,
      right: variable.right,
      rightValue,
      predicateResult,
      thenValue: variable.thenValue,
      elseValue: variable.elseValue,
      result: value,
    },
  };
}

export function evaluateSessionVariable(
  variable: SessionSnapshotVariableConfig,
  rowIndex: number,
  rows: ComputedCandle[],
  sessionValues: Record<string, VariableValue>,
): { value: NullableNumber; trace: SessionTrace } {
  const existing = sessionValues[variable.name];
  if (existing !== undefined && typeof existing === 'number') {
    return {
      value: existing,
      trace: {
        type: 'session',
        frozen: true,
        triggerAtCandleCount: variable.trigger.value,
        range: variable.range,
        usedValues: [],
        result: existing,
      },
    };
  }

  const candleCount = rowIndex + 1;
  const canTrigger = candleCount >= variable.trigger.value && candleCount >= variable.range.endIndex;

  if (!canTrigger) {
    return {
      value: null,
      trace: {
        type: 'session',
        frozen: false,
        triggerAtCandleCount: variable.trigger.value,
        range: variable.range,
        usedValues: [],
        result: null,
      },
    };
  }

  const start = variable.range.startIndex - 1;
  const end = variable.range.endIndex - 1;
  const usedValues: number[] = [];

  for (let index = start; index <= end; index += 1) {
    const row = rows[index];
    if (!row) {
      return {
        value: null,
        trace: {
          type: 'session',
          frozen: false,
          triggerAtCandleCount: variable.trigger.value,
          range: variable.range,
          usedValues: [],
          result: null,
        },
      };
    }
    usedValues.push(row[variable.source]);
  }

  const value = toFixedOrNull(aggregate(usedValues, variable.aggregation));

  return {
    value,
    trace: {
      type: 'session',
      frozen: true,
      triggerAtCandleCount: variable.trigger.value,
      range: variable.range,
      usedValues,
      result: value,
    },
  };
}
