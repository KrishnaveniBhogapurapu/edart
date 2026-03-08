import { AggregationType, NullableNumber } from './types.js';

export function aggregate(values: number[], aggregation: AggregationType): NullableNumber {
  if (!values.length) {
    return null;
  }

  switch (aggregation) {
    case 'sum':
      return values.reduce((acc, value) => acc + value, 0);
    case 'avg':
      return values.reduce((acc, value) => acc + value, 0) / values.length;
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    default:
      return null;
  }
}

export function safeDivide(left: NullableNumber, right: NullableNumber): NullableNumber {
  if (left === null || right === null || right === 0) {
    return null;
  }
  return left / right;
}

export function toFixedOrNull(value: NullableNumber, precision = 6): NullableNumber {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  return Number(value.toFixed(precision));
}
