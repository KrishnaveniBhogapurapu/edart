import { describe, expect, it } from 'vitest';
import { computeCandles } from './engine.js';
import { validateVariableConfigs } from './validation.js';
import { VariableConfig } from './types.js';

describe('computeCandles', () => {
  const candles = [
    { time: '09:15', open: 100, high: 101, low: 99, close: 100.5 },
    { time: '09:18', open: 101, high: 102, low: 100, close: 101.2 },
    { time: '09:21', open: 102, high: 103, low: 101, close: 102.5 },
    { time: '09:24', open: 103, high: 104, low: 102, close: 103.3 },
  ];

  it('computes rolling base and derived values', () => {
    const variables: VariableConfig[] = [
      {
        kind: 'base',
        scope: 'row',
        name: 'SumOpen2',
        windowSize: 2,
        source: 'open',
        aggregation: 'sum',
      },
      {
        kind: 'base',
        scope: 'row',
        name: 'SumClose2',
        windowSize: 2,
        source: 'close',
        aggregation: 'sum',
      },
      {
        kind: 'derived',
        scope: 'row',
        name: 'Diff',
        left: { type: 'variable', name: 'SumOpen2' },
        right: { type: 'variable', name: 'SumClose2' },
        operator: '-',
      },
    ];

    const result = computeCandles({ candles, variables });
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].variables.SumOpen2).toBeNull();
    expect(result.rows[2].variables.SumOpen2).toBe(201);
    expect(result.rows[2].variables.SumClose2).toBe(201.7);
    expect(result.rows[2].variables.Diff).toBe(-0.7);
  });

  it('supports include-current behavior when excludeRecent is 0', () => {
    const variables: VariableConfig[] = [
      {
        kind: 'base',
        scope: 'row',
        name: 'SumOpen2IncCurrent',
        windowSize: 2,
        excludeRecent: 0,
        source: 'open',
        aggregation: 'sum',
      },
    ];

    const result = computeCandles({ candles, variables });
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].variables.SumOpen2IncCurrent).toBeNull();
    expect(result.rows[1].variables.SumOpen2IncCurrent).toBe(201);
    expect(result.rows[2].variables.SumOpen2IncCurrent).toBe(203);
  });

  it('freezes base value on first non-null result', () => {
    const variables: VariableConfig[] = [
      {
        kind: 'base',
        scope: 'row',
        name: 'SumOpen2Frozen',
        windowSize: 2,
        excludeRecent: 0,
        source: 'open',
        aggregation: 'sum',
        freeze: true,
      },
    ];

    const result = computeCandles({ candles, variables });
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].variables.SumOpen2Frozen).toBeNull();
    expect(result.rows[1].variables.SumOpen2Frozen).toBe(201);
    expect(result.rows[2].variables.SumOpen2Frozen).toBe(201);
    expect(result.rows[3].variables.SumOpen2Frozen).toBe(201);
  });

  it('supports sum (+) for derived variables', () => {
    const variables: VariableConfig[] = [
      {
        kind: 'base',
        scope: 'row',
        name: 'SumOpen2',
        windowSize: 2,
        source: 'open',
        aggregation: 'sum',
      },
      {
        kind: 'base',
        scope: 'row',
        name: 'SumClose2',
        windowSize: 2,
        source: 'close',
        aggregation: 'sum',
      },
      {
        kind: 'derived',
        scope: 'row',
        name: 'SumBoth',
        left: { type: 'variable', name: 'SumOpen2' },
        right: { type: 'variable', name: 'SumClose2' },
        operator: '+',
      },
    ];

    const result = computeCandles({ candles, variables });
    expect(result.errors).toHaveLength(0);
    expect(result.rows[2].variables.SumBoth).toBe(402.7);
  });

  it('supports condition chaining with variable/string/number outputs', () => {
    const variables: VariableConfig[] = [
      {
        kind: 'base',
        scope: 'row',
        name: 'PrevOpen',
        windowSize: 1,
        excludeRecent: 1,
        source: 'open',
        aggregation: 'sum',
      },
      {
        kind: 'base',
        scope: 'row',
        name: 'CurrOpen',
        windowSize: 1,
        excludeRecent: 0,
        source: 'open',
        aggregation: 'sum',
      },
      {
        kind: 'condition',
        scope: 'row',
        name: 'Tag',
        left: { type: 'variable', name: 'CurrOpen' },
        comparator: '>',
        right: { type: 'variable', name: 'PrevOpen' },
        thenValue: { type: 'constant', value: 'P' },
        elseValue: { type: 'constant', value: 'C' },
      },
      {
        kind: 'condition',
        scope: 'row',
        name: 'Signal',
        left: { type: 'variable', name: 'Tag' },
        comparator: '==',
        right: { type: 'constant', value: 'P' },
        thenValue: { type: 'constant', value: 2 },
        elseValue: { type: 'variable', name: 'PrevOpen' },
      },
    ];

    const result = computeCandles({ candles, variables });
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].variables.Tag).toBeNull();
    expect(result.rows[0].variables.Signal).toBeNull();
    expect(result.rows[1].variables.Tag).toBe('P');
    expect(result.rows[1].variables.Signal).toBe(2);
    expect(result.rows[3].variables.Tag).toBe('P');
    expect(result.rows[3].variables.Signal).toBe(2);
  });

  it('freezes derived value on first non-null result', () => {
    const variables: VariableConfig[] = [
      {
        kind: 'base',
        scope: 'row',
        name: 'PrevOpen',
        windowSize: 1,
        excludeRecent: 1,
        source: 'open',
        aggregation: 'sum',
      },
      {
        kind: 'base',
        scope: 'row',
        name: 'CurrOpen',
        windowSize: 1,
        excludeRecent: 0,
        source: 'open',
        aggregation: 'sum',
      },
      {
        kind: 'derived',
        scope: 'row',
        name: 'Delta',
        left: { type: 'variable', name: 'CurrOpen' },
        right: { type: 'variable', name: 'PrevOpen' },
        operator: '-',
        freeze: true,
      },
    ];

    const result = computeCandles({ candles, variables });
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].variables.Delta).toBeNull();
    expect(result.rows[1].variables.Delta).toBe(1);
    expect(result.rows[2].variables.Delta).toBe(1);
    expect(result.rows[3].variables.Delta).toBe(1);
  });

  it('freezes condition output on first non-null result', () => {
    const variables: VariableConfig[] = [
      {
        kind: 'base',
        scope: 'row',
        name: 'CurrOpen',
        windowSize: 1,
        excludeRecent: 0,
        source: 'open',
        aggregation: 'sum',
      },
      {
        kind: 'condition',
        scope: 'row',
        name: 'Bucket',
        left: { type: 'variable', name: 'CurrOpen' },
        comparator: '>',
        right: { type: 'constant', value: 101 },
        thenValue: { type: 'constant', value: 'H' },
        elseValue: { type: 'constant', value: 'L' },
        freeze: true,
      },
    ];

    const result = computeCandles({ candles, variables });
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].variables.Bucket).toBe('L');
    expect(result.rows[1].variables.Bucket).toBe('L');
    expect(result.rows[2].variables.Bucket).toBe('L');
    expect(result.rows[3].variables.Bucket).toBe('L');
  });

  it('freezes session snapshot once trigger is met', () => {
    const variables: VariableConfig[] = [
      {
        kind: 'session',
        scope: 'session',
        computeMode: 'once',
        name: 'X',
        trigger: { type: 'candleCountGte', value: 3 },
        range: { startIndex: 1, endIndex: 3 },
        source: 'close',
        aggregation: 'avg',
      },
    ];

    const result = computeCandles({ candles, variables });
    expect(result.rows[0].variables.X).toBeNull();
    expect(result.rows[2].variables.X).toBe(101.4);
    expect(result.rows[3].variables.X).toBe(101.4);
  });
});

describe('validateVariableConfigs', () => {
  it('rejects dependency cycles', () => {
    const variables: VariableConfig[] = [
      {
        kind: 'derived',
        scope: 'row',
        name: 'A',
        left: { type: 'variable', name: 'B' },
        right: { type: 'constant', value: 1 },
        operator: '-',
      },
      {
        kind: 'derived',
        scope: 'row',
        name: 'B',
        left: { type: 'variable', name: 'A' },
        right: { type: 'constant', value: 1 },
        operator: '-',
      },
    ];

    const result = validateVariableConfigs(variables);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('Cycle detected'))).toBe(true);
  });

  it('rejects negative excludeRecent in base variables', () => {
    const variables: VariableConfig[] = [
      {
        kind: 'base',
        scope: 'row',
        name: 'BaseBad',
        windowSize: 2,
        excludeRecent: -1,
        source: 'open',
        aggregation: 'sum',
      },
    ];

    const result = validateVariableConfigs(variables);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('excludeRecent'))).toBe(true);
  });
});
