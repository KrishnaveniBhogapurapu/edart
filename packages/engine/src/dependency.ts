import { VariableConfig } from './types.js';

function operandRefName(operand: { type: 'variable' | 'constant'; name?: string }): string | null {
  return operand.type === 'variable' && operand.name ? operand.name : null;
}

export function getVariableReferences(config: VariableConfig): string[] {
  if (config.kind === 'derived') {
    return [operandRefName(config.left), operandRefName(config.right)].filter(
      (value): value is string => Boolean(value),
    );
  }

  if (config.kind === 'condition') {
    return [
      operandRefName(config.left),
      operandRefName(config.right),
      operandRefName(config.thenValue),
      operandRefName(config.elseValue),
    ].filter((value): value is string => Boolean(value));
  }

  return [];
}

export function findUnknownReferences(configs: VariableConfig[]): string[] {
  const names = new Set(configs.map((config) => config.name));
  const errors: string[] = [];

  for (const config of configs) {
    const refs = getVariableReferences(config);
    for (const reference of refs) {
      if (!names.has(reference)) {
        errors.push(`Variable "${config.name}" references unknown variable "${reference}".`);
      }
    }
  }

  return errors;
}

export function detectDependencyCycles(configs: VariableConfig[]): string[] {
  const adjacency = new Map<string, string[]>();

  for (const config of configs) {
    const refs = getVariableReferences(config);
    if (refs.length) {
      adjacency.set(config.name, refs);
    }
  }

  const visited = new Set<string>();
  const active = new Set<string>();
  const cycles: string[] = [];

  function dfs(node: string, path: string[]): void {
    if (!adjacency.has(node)) {
      return;
    }
    if (active.has(node)) {
      const cycleStart = path.indexOf(node);
      const cyclePath = [...path.slice(Math.max(0, cycleStart)), node];
      cycles.push(`Cycle detected: ${cyclePath.join(' -> ')}`);
      return;
    }
    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    active.add(node);

    const neighbors = adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (adjacency.has(neighbor)) {
        dfs(neighbor, [...path, node]);
      }
    }

    active.delete(node);
  }

  for (const node of adjacency.keys()) {
    dfs(node, []);
  }

  return Array.from(new Set(cycles));
}
