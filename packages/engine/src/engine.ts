import {
  BaseTrace,
  BaseVariableConfig,
  ComputeOptions,
  ComputationResult,
  ComputedCandle,
  ConditionTrace,
  ConditionVariableConfig,
  DerivedTrace,
  DerivedVariableConfig,
  SessionSnapshotVariableConfig,
  VariableConfig,
  VariableValue,
} from './types.js';
import {
  evaluateBaseVariable,
  evaluateConditionVariable,
  evaluateDerivedVariable,
  evaluateSessionVariable,
} from './evaluator.js';
import { getVariableReferences } from './dependency.js';
import { validateVariableConfigs } from './validation.js';

function partitionVariables(variables: VariableConfig[]): {
  base: BaseVariableConfig[];
  rowOps: Array<DerivedVariableConfig | ConditionVariableConfig>;
  session: SessionSnapshotVariableConfig[];
} {
  return {
    base: variables.filter((item): item is BaseVariableConfig => item.kind === 'base'),
    rowOps: variables.filter(
      (item): item is DerivedVariableConfig | ConditionVariableConfig =>
        item.kind === 'derived' || item.kind === 'condition',
    ),
    session: variables.filter((item): item is SessionSnapshotVariableConfig => item.kind === 'session'),
  };
}

function sortRowOps(variables: Array<DerivedVariableConfig | ConditionVariableConfig>) {
  const byName = new Map(variables.map((item) => [item.name, item]));
  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const variable of variables) {
    adjacency.set(variable.name, []);
    indegree.set(variable.name, 0);
  }

  for (const variable of variables) {
    const refs = getVariableReferences(variable);
    for (const ref of refs) {
      if (byName.has(ref)) {
        adjacency.get(ref)?.push(variable.name);
        indegree.set(variable.name, (indegree.get(variable.name) ?? 0) + 1);
      }
    }
  }

  const queue = Array.from(indegree.entries())
    .filter(([, degree]) => degree === 0)
    .map(([name]) => name);

  const ordered: Array<DerivedVariableConfig | ConditionVariableConfig> = [];

  while (queue.length) {
    const name = queue.shift()!;
    const variable = byName.get(name);
    if (variable) {
      ordered.push(variable);
    }

    const nexts = adjacency.get(name) ?? [];
    for (const next of nexts) {
      const nextDegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) {
        queue.push(next);
      }
    }
  }

  return ordered.length === variables.length ? ordered : variables;
}

function buildFrozenBaseTrace(variable: BaseVariableConfig, value: VariableValue): BaseTrace {
  return {
    type: 'base',
    usedRowIndices: [],
    usedValues: [],
    excludeRecent: variable.excludeRecent ?? 1,
    aggregation: variable.aggregation,
    source: variable.source,
    result: typeof value === 'number' ? value : null,
    frozen: true,
  };
}

function buildFrozenDerivedTrace(variable: DerivedVariableConfig, value: VariableValue): DerivedTrace {
  return {
    type: 'derived',
    left: variable.left,
    leftValue: null,
    operator: variable.operator,
    right: variable.right,
    rightValue: null,
    result: typeof value === 'number' ? value : null,
    frozen: true,
  };
}

function buildFrozenConditionTrace(
  variable: ConditionVariableConfig,
  value: VariableValue,
): ConditionTrace {
  return {
    type: 'condition',
    left: variable.left,
    leftValue: null,
    comparator: variable.comparator,
    right: variable.right,
    rightValue: null,
    predicateResult: null,
    thenValue: variable.thenValue,
    elseValue: variable.elseValue,
    result: value,
    frozen: true,
  };
}

export function computeCandles(options: ComputeOptions): ComputationResult {
  const validation = validateVariableConfigs(options.variables);

  if (!validation.ok) {
    return {
      rows: [],
      sessionValues: {},
      errors: validation.errors,
    };
  }

  const partitions = partitionVariables(options.variables);
  const rowOps = sortRowOps(partitions.rowOps);
  const sessionValues: Record<string, VariableValue> = {};
  const frozenValues: Record<string, VariableValue> = {};

  const rows: ComputedCandle[] = options.candles.map((candle) => ({
    ...candle,
    variables: {},
    trace: {},
  }));

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const rowVariables: Record<string, VariableValue> = {};
    const rowTrace = row.trace;

    for (const variable of partitions.base) {
      if (variable.freeze && frozenValues[variable.name] !== undefined) {
        const frozenValue = frozenValues[variable.name];
        rowVariables[variable.name] = typeof frozenValue === 'number' ? frozenValue : null;
        rowTrace[variable.name] = buildFrozenBaseTrace(variable, frozenValue);
        continue;
      }

      const { value, trace } = evaluateBaseVariable(variable, rowIndex, rows);
      rowVariables[variable.name] = value;
      rowTrace[variable.name] = trace;

      if (variable.freeze && value !== null && frozenValues[variable.name] === undefined) {
        frozenValues[variable.name] = value;
      }
    }

    for (const variable of rowOps) {
      if (variable.kind === 'derived') {
        if (variable.freeze && frozenValues[variable.name] !== undefined) {
          const frozenValue = frozenValues[variable.name];
          rowVariables[variable.name] = typeof frozenValue === 'number' ? frozenValue : null;
          rowTrace[variable.name] = buildFrozenDerivedTrace(variable, frozenValue);
          continue;
        }

        const { value, trace } = evaluateDerivedVariable(variable, rowVariables, sessionValues);
        rowVariables[variable.name] = value;
        rowTrace[variable.name] = trace;

        if (variable.freeze && value !== null && frozenValues[variable.name] === undefined) {
          frozenValues[variable.name] = value;
        }
      } else {
        if (variable.freeze && frozenValues[variable.name] !== undefined) {
          const frozenValue = frozenValues[variable.name];
          rowVariables[variable.name] = frozenValue;
          rowTrace[variable.name] = buildFrozenConditionTrace(variable, frozenValue);
          continue;
        }

        const { value, trace } = evaluateConditionVariable(variable, rowVariables, sessionValues);
        rowVariables[variable.name] = value;
        rowTrace[variable.name] = trace;

        if (variable.freeze && value !== null && frozenValues[variable.name] === undefined) {
          frozenValues[variable.name] = value;
        }
      }
    }

    for (const variable of partitions.session) {
      const { value, trace } = evaluateSessionVariable(variable, rowIndex, rows, sessionValues);
      if (trace.frozen && sessionValues[variable.name] === undefined) {
        sessionValues[variable.name] = value;
      }
      rowTrace[variable.name] = trace;
    }

    for (const variable of partitions.session) {
      rowVariables[variable.name] = sessionValues[variable.name] ?? null;
    }

    row.variables = rowVariables;
  }

  return {
    rows,
    sessionValues,
    errors: [],
  };
}
