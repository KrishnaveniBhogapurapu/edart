import {
  BaseVariableConfig,
  ConditionVariableConfig,
  DerivedVariableConfig,
  Operand,
  SessionSnapshotVariableConfig,
  VariableConfig,
} from './types.js';
import { detectDependencyCycles, findUnknownReferences } from './dependency.js';

function validateBase(config: BaseVariableConfig): string[] {
  const errors: string[] = [];
  if (config.windowSize < 1 || !Number.isInteger(config.windowSize)) {
    errors.push(`Base variable "${config.name}" must have a positive integer windowSize.`);
  }
  if (config.freeze !== undefined && typeof config.freeze !== 'boolean') {
    errors.push(`Base variable "${config.name}" freeze must be boolean.`);
  }
  if (
    config.excludeRecent !== undefined &&
    (config.excludeRecent < 0 || !Number.isInteger(config.excludeRecent))
  ) {
    errors.push(`Base variable "${config.name}" must have a non-negative integer excludeRecent.`);
  }
  return errors;
}

function validateOperand(configName: string, operandName: string, operand: Operand): string[] {
  const errors: string[] = [];
  if (operand.type === 'variable') {
    if (!operand.name || !operand.name.trim()) {
      errors.push(`Variable "${configName}" has empty ${operandName} variable reference.`);
    }
  } else if (operand.type === 'constant') {
    if (typeof operand.value !== 'number' && typeof operand.value !== 'string') {
      errors.push(`Variable "${configName}" has invalid ${operandName} constant value.`);
    }
  } else {
    errors.push(`Variable "${configName}" has unsupported ${operandName} operand type.`);
  }
  return errors;
}

function validateDerived(config: DerivedVariableConfig): string[] {
  const errors: string[] = [];
  if (!['+', '-', '/'].includes(config.operator)) {
    errors.push(`Derived variable "${config.name}" has unsupported operator "${config.operator}".`);
  }
  if (config.freeze !== undefined && typeof config.freeze !== 'boolean') {
    errors.push(`Derived variable "${config.name}" freeze must be boolean.`);
  }

  errors.push(...validateOperand(config.name, 'left', config.left));
  errors.push(...validateOperand(config.name, 'right', config.right));

  if (config.left.type === 'constant' && typeof config.left.value !== 'number') {
    errors.push(`Derived variable "${config.name}" left constant must be numeric.`);
  }

  if (config.right.type === 'constant' && typeof config.right.value !== 'number') {
    errors.push(`Derived variable "${config.name}" right constant must be numeric.`);
  }

  return errors;
}

function validateCondition(config: ConditionVariableConfig): string[] {
  const errors: string[] = [];
  if (!['>', '<', '>=', '<=', '==', '!='].includes(config.comparator)) {
    errors.push(`Condition variable "${config.name}" has unsupported comparator "${config.comparator}".`);
  }
  if (config.freeze !== undefined && typeof config.freeze !== 'boolean') {
    errors.push(`Condition variable "${config.name}" freeze must be boolean.`);
  }

  errors.push(...validateOperand(config.name, 'left', config.left));
  errors.push(...validateOperand(config.name, 'right', config.right));
  errors.push(...validateOperand(config.name, 'thenValue', config.thenValue));
  errors.push(...validateOperand(config.name, 'elseValue', config.elseValue));

  return errors;
}

function validateSession(config: SessionSnapshotVariableConfig): string[] {
  const errors: string[] = [];
  if (config.trigger.type !== 'candleCountGte') {
    errors.push(`Session variable "${config.name}" must use candleCountGte trigger.`);
  }
  if (config.trigger.value < 1 || !Number.isInteger(config.trigger.value)) {
    errors.push(`Session variable "${config.name}" trigger value must be a positive integer.`);
  }
  if (config.range.startIndex < 1 || config.range.endIndex < 1) {
    errors.push(`Session variable "${config.name}" range must be 1-based and positive.`);
  }
  if (config.range.endIndex < config.range.startIndex) {
    errors.push(`Session variable "${config.name}" range endIndex must be >= startIndex.`);
  }
  return errors;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateVariableConfigs(configs: VariableConfig[]): ValidationResult {
  const errors: string[] = [];
  const names = new Set<string>();

  for (const config of configs) {
    if (!config.name || !config.name.trim()) {
      errors.push('Variable name cannot be empty.');
      continue;
    }

    if (names.has(config.name)) {
      errors.push(`Duplicate variable name "${config.name}".`);
    }
    names.add(config.name);

    if (config.kind === 'base') {
      errors.push(...validateBase(config));
    } else if (config.kind === 'derived') {
      errors.push(...validateDerived(config));
    } else if (config.kind === 'condition') {
      errors.push(...validateCondition(config));
    } else if (config.kind === 'session') {
      errors.push(...validateSession(config));
    }
  }

  errors.push(...findUnknownReferences(configs));
  errors.push(...detectDependencyCycles(configs));

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function assertValidVariableConfigs(configs: VariableConfig[]): void {
  const result = validateVariableConfigs(configs);
  if (!result.ok) {
    throw new Error(result.errors.join('\n'));
  }
}
