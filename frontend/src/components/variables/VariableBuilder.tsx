import {
  BaseVariableConfig,
  ConditionOperator,
  ConditionVariableConfig,
  DerivedVariableConfig,
  Operand,
  VariableConfig,
} from '@candle/engine';
import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

interface VariableBuilderProps {
  variables: VariableConfig[];
  onVariablesChange: (variables: VariableConfig[]) => void;
}

type VariableKind = 'base' | 'derived' | 'condition';
type OperandType = 'variable' | 'constant';
type ConditionOperandType = 'variable' | 'number' | 'string';
type OutputType = 'variable' | 'number' | 'string';

const sourceColumns = ['open', 'high', 'low', 'close'] as const;
const aggregations = ['sum', 'avg', 'max', 'min'] as const;
const conditionComparators: ConditionOperator[] = ['>', '<', '>=', '<=', '==', '!='];

function parseClampedInt(value: string, min: number, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(min, parsed);
}

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coerceNumericOperand(
  type: OperandType,
  variableName: string,
  constantValue: string,
): { type: 'variable'; name: string } | { type: 'constant'; value: number } {
  if (type === 'variable') {
    return { type: 'variable', name: variableName };
  }
  return { type: 'constant', value: parseNumber(constantValue, 0) };
}

function coerceOutputOperand(
  type: OutputType,
  variableName: string,
  numberValue: string,
  stringValue: string,
): Operand {
  if (type === 'variable') {
    return { type: 'variable', name: variableName };
  }
  if (type === 'number') {
    return { type: 'constant', value: parseNumber(numberValue, 0) };
  }
  return { type: 'constant', value: stringValue };
}

function coerceConditionOperand(
  type: ConditionOperandType,
  variableName: string,
  numberValue: string,
  stringValue: string,
): Operand {
  if (type === 'variable') {
    return { type: 'variable', name: variableName };
  }
  if (type === 'number') {
    return { type: 'constant', value: parseNumber(numberValue, 0) };
  }
  return { type: 'constant', value: stringValue };
}

function normalizeNumericOperand(
  operand: unknown,
): { type: OperandType; variableName: string; constantValue: string } {
  if (operand && typeof operand === 'object' && 'type' in operand) {
    const typed = operand as { type?: string; name?: string; value?: unknown };
    if (typed.type === 'variable') {
      return {
        type: 'variable',
        variableName: typed.name ?? '',
        constantValue: '0',
      };
    }
    if (typed.type === 'constant') {
      return {
        type: 'constant',
        variableName: '',
        constantValue: String(typed.value ?? 0),
      };
    }
  }

  if (typeof operand === 'string') {
    return {
      type: 'variable',
      variableName: operand,
      constantValue: '0',
    };
  }

  return {
    type: 'variable',
    variableName: '',
    constantValue: '0',
  };
}

function normalizeOutputOperand(
  operand: unknown,
): { type: OutputType; variableName: string; numberValue: string; stringValue: string } {
  if (operand && typeof operand === 'object' && 'type' in operand) {
    const typed = operand as { type?: string; name?: string; value?: unknown };
    if (typed.type === 'variable') {
      return {
        type: 'variable',
        variableName: typed.name ?? '',
        numberValue: '0',
        stringValue: '',
      };
    }
    if (typed.type === 'constant') {
      if (typeof typed.value === 'number') {
        return {
          type: 'number',
          variableName: '',
          numberValue: String(typed.value),
          stringValue: '',
        };
      }
      return {
        type: 'string',
        variableName: '',
        numberValue: '0',
        stringValue: String(typed.value ?? ''),
      };
    }
  }

  return {
    type: 'string',
    variableName: '',
    numberValue: '0',
    stringValue: '',
  };
}

function normalizeConditionOperand(
  operand: unknown,
): { type: ConditionOperandType; variableName: string; numberValue: string; stringValue: string } {
  if (operand && typeof operand === 'object' && 'type' in operand) {
    const typed = operand as { type?: string; name?: string; value?: unknown };
    if (typed.type === 'variable') {
      return {
        type: 'variable',
        variableName: typed.name ?? '',
        numberValue: '0',
        stringValue: '',
      };
    }
    if (typed.type === 'constant') {
      if (typeof typed.value === 'number') {
        return {
          type: 'number',
          variableName: '',
          numberValue: String(typed.value),
          stringValue: '',
        };
      }
      return {
        type: 'string',
        variableName: '',
        numberValue: '0',
        stringValue: String(typed.value ?? ''),
      };
    }
  }

  return {
    type: 'variable',
    variableName: '',
    numberValue: '0',
    stringValue: '',
  };
}

export function VariableBuilder({ variables, onVariablesChange }: VariableBuilderProps) {
  const [kind, setKind] = useState<VariableKind>('base');
  const [editingName, setEditingName] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [windowSize, setWindowSize] = useState(3);
  const [excludeRecent, setExcludeRecent] = useState(1);
  const [source, setSource] = useState<(typeof sourceColumns)[number]>('open');
  const [aggregation, setAggregation] = useState<(typeof aggregations)[number]>('sum');

  const [operator, setOperator] = useState<'+' | '-' | '/'>('-');
  const [leftType, setLeftType] = useState<OperandType>('variable');
  const [leftVar, setLeftVar] = useState('');
  const [leftConst, setLeftConst] = useState('0');
  const [rightType, setRightType] = useState<OperandType>('variable');
  const [rightVar, setRightVar] = useState('');
  const [rightConst, setRightConst] = useState('0');

  const [comparator, setComparator] = useState<ConditionOperator>('>');
  const [condLeftType, setCondLeftType] = useState<ConditionOperandType>('variable');
  const [condLeftVar, setCondLeftVar] = useState('');
  const [condLeftNumber, setCondLeftNumber] = useState('0');
  const [condLeftString, setCondLeftString] = useState('');
  const [condRightType, setCondRightType] = useState<ConditionOperandType>('variable');
  const [condRightVar, setCondRightVar] = useState('');
  const [condRightNumber, setCondRightNumber] = useState('0');
  const [condRightString, setCondRightString] = useState('');
  const [thenType, setThenType] = useState<OutputType>('string');
  const [thenVar, setThenVar] = useState('');
  const [thenNumber, setThenNumber] = useState('0');
  const [thenString, setThenString] = useState('A');
  const [elseType, setElseType] = useState<OutputType>('string');
  const [elseVar, setElseVar] = useState('');
  const [elseNumber, setElseNumber] = useState('0');
  const [elseString, setElseString] = useState('C');

  const [baseFreeze, setBaseFreeze] = useState(false);
  const [derivedFreeze, setDerivedFreeze] = useState(false);
  const [conditionFreeze, setConditionFreeze] = useState(false);

  const variableNames = useMemo(() => variables.map((item) => item.name), [variables]);

  const reset = () => {
    setEditingName(null);
    setName('');
    setWindowSize(3);
    setExcludeRecent(1);
    setSource('open');
    setAggregation('sum');
    setOperator('-');
    setLeftType('variable');
    setLeftVar('');
    setLeftConst('0');
    setRightType('variable');
    setRightVar('');
    setRightConst('0');
    setComparator('>');
    setCondLeftType('variable');
    setCondLeftVar('');
    setCondLeftNumber('0');
    setCondLeftString('');
    setCondRightType('variable');
    setCondRightVar('');
    setCondRightNumber('0');
    setCondRightString('');
    setThenType('string');
    setThenVar('');
    setThenNumber('0');
    setThenString('A');
    setElseType('string');
    setElseVar('');
    setElseNumber('0');
    setElseString('C');
    setBaseFreeze(false);
    setDerivedFreeze(false);
    setConditionFreeze(false);
  };

  const submit = () => {
    if (!name.trim()) {
      return;
    }

    let next: VariableConfig;

    if (kind === 'base') {
      next = {
        kind: 'base',
        scope: 'row',
        name,
        windowSize: Math.max(1, Number(windowSize)),
        excludeRecent: Math.max(0, Number(excludeRecent)),
        source,
        aggregation,
        freeze: baseFreeze,
      } as BaseVariableConfig;
    } else if (kind === 'derived') {
      next = {
        kind: 'derived',
        scope: 'row',
        name,
        left: coerceNumericOperand(leftType, leftVar, leftConst),
        right: coerceNumericOperand(rightType, rightVar, rightConst),
        operator,
        freeze: derivedFreeze,
      } as DerivedVariableConfig;
    } else if (kind === 'condition') {
      next = {
        kind: 'condition',
        scope: 'row',
        name,
        left: coerceConditionOperand(
          condLeftType,
          condLeftVar,
          condLeftNumber,
          condLeftString,
        ),
        comparator,
        right: coerceConditionOperand(
          condRightType,
          condRightVar,
          condRightNumber,
          condRightString,
        ),
        thenValue: coerceOutputOperand(thenType, thenVar, thenNumber, thenString),
        elseValue: coerceOutputOperand(elseType, elseVar, elseNumber, elseString),
        freeze: conditionFreeze,
      } as ConditionVariableConfig;
    } else {
      return;
    }

    const withoutEditing = editingName
      ? variables.filter((item) => item.name !== editingName)
      : variables;

    onVariablesChange([...withoutEditing.filter((item) => item.name !== next.name), next]);
    reset();
  };

  const startEdit = (variable: VariableConfig) => {
    if (variable.kind === 'session') {
      return;
    }

    setEditingName(variable.name);
    setKind(variable.kind as VariableKind);
    setName(variable.name);

    if (variable.kind === 'base') {
      setWindowSize(variable.windowSize);
      setExcludeRecent(variable.excludeRecent ?? 1);
      setSource(variable.source);
      setAggregation(variable.aggregation);
      setBaseFreeze(Boolean(variable.freeze));
    }

    if (variable.kind === 'derived') {
      setOperator(variable.operator);
      const left = normalizeNumericOperand(variable.left);
      const right = normalizeNumericOperand(variable.right);
      setLeftType(left.type);
      setLeftVar(left.variableName);
      setLeftConst(left.constantValue);
      setRightType(right.type);
      setRightVar(right.variableName);
      setRightConst(right.constantValue);
      setDerivedFreeze(Boolean(variable.freeze));
    }

    if (variable.kind === 'condition') {
      setComparator(variable.comparator);

      const left = normalizeConditionOperand(variable.left);
      const right = normalizeConditionOperand(variable.right);
      setCondLeftType(left.type);
      setCondLeftVar(left.variableName);
      setCondLeftNumber(left.numberValue);
      setCondLeftString(left.stringValue);
      setCondRightType(right.type);
      setCondRightVar(right.variableName);
      setCondRightNumber(right.numberValue);
      setCondRightString(right.stringValue);

      const thenOutput = normalizeOutputOperand(variable.thenValue);
      setThenType(thenOutput.type);
      setThenVar(thenOutput.variableName);
      setThenNumber(thenOutput.numberValue);
      setThenString(thenOutput.stringValue);

      const elseOutput = normalizeOutputOperand(variable.elseValue);
      setElseType(elseOutput.type);
      setElseVar(elseOutput.variableName);
      setElseNumber(elseOutput.numberValue);
      setElseString(elseOutput.stringValue);
      setConditionFreeze(Boolean(variable.freeze));
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Variable Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={kind} onChange={(event) => setKind(event.target.value as VariableKind)}>
          <option value="base">Base Row Variable</option>
          <option value="derived">Derived Row Variable</option>
          <option value="condition">Condition Variable</option>
        </Select>

        <Input placeholder="Variable Name" value={name} onChange={(event) => setName(event.target.value)} />

        {kind === 'base' ? (
          <div className="space-y-2 rounded-md border border-border p-2">
            <div className="text-xs font-semibold text-muted">Base Variable Settings</div>
            <div className="text-[11px] text-muted">Window Size (candles)</div>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={windowSize}
              onChange={(event) => setWindowSize(parseClampedInt(event.target.value, 1, 1))}
              placeholder="Window Size"
            />
            <div className="text-[11px] text-muted">Exclude Recent Candles (0 includes current)</div>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={excludeRecent}
              onChange={(event) => setExcludeRecent(parseClampedInt(event.target.value, 0, 0))}
              placeholder="Exclude Recent (0 includes current)"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={source} onChange={(event) => setSource(event.target.value as typeof source)}>
                {sourceColumns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </Select>
              <Select value={aggregation} onChange={(event) => setAggregation(event.target.value as typeof aggregation)}>
                {aggregations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>

            <label className="flex items-center gap-2 text-[11px] text-muted">
              <input
                type="checkbox"
                checked={baseFreeze}
                onChange={(event) => setBaseFreeze(event.target.checked)}
              />
              Freeze first non-null value
            </label>

          </div>
        ) : null}

        {kind === 'derived' ? (
          <div className="space-y-2 rounded-md border border-border p-2">
            <div className="text-xs font-semibold text-muted">Derived Formula</div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={leftType} onChange={(event) => setLeftType(event.target.value as OperandType)}>
                <option value="variable">left: variable</option>
                <option value="constant">left: constant</option>
              </Select>
              {leftType === 'variable' ? (
                <Select value={leftVar} onChange={(event) => setLeftVar(event.target.value)}>
                  <option value="">Select variable</option>
                  {variableNames.map((varName) => (
                    <option key={varName} value={varName}>
                      {varName}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type="number"
                  step={1}
                  inputMode="decimal"
                  value={leftConst}
                  onChange={(event) => setLeftConst(event.target.value)}
                  placeholder="Left constant"
                />
              )}
            </div>

            <Select value={operator} onChange={(event) => setOperator(event.target.value as '+' | '-' | '/')}>
              <option value="+">sum (+)</option>
              <option value="-">diff (-)</option>
              <option value="/">divide (/)</option>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <Select value={rightType} onChange={(event) => setRightType(event.target.value as OperandType)}>
                <option value="variable">right: variable</option>
                <option value="constant">right: constant</option>
              </Select>
              {rightType === 'variable' ? (
                <Select value={rightVar} onChange={(event) => setRightVar(event.target.value)}>
                  <option value="">Select variable</option>
                  {variableNames.map((varName) => (
                    <option key={varName} value={varName}>
                      {varName}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type="number"
                  step={1}
                  inputMode="decimal"
                  value={rightConst}
                  onChange={(event) => setRightConst(event.target.value)}
                  placeholder="Right constant"
                />
              )}
            </div>

            <label className="flex items-center gap-2 text-[11px] text-muted">
              <input
                type="checkbox"
                checked={derivedFreeze}
                onChange={(event) => setDerivedFreeze(event.target.checked)}
              />
              Freeze first non-null value
            </label>
          </div>
        ) : null}

        {kind === 'condition' ? (
          <div className="space-y-2 rounded-md border border-border p-2">
            <div className="text-xs font-semibold text-muted">Condition Rule</div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={condLeftType}
                onChange={(event) => setCondLeftType(event.target.value as ConditionOperandType)}
              >
                <option value="variable">left: variable</option>
                <option value="number">left: number</option>
                <option value="string">left: string</option>
              </Select>
              {condLeftType === 'variable' ? (
                <Select value={condLeftVar} onChange={(event) => setCondLeftVar(event.target.value)}>
                  <option value="">Select variable</option>
                  {variableNames.map((varName) => (
                    <option key={varName} value={varName}>
                      {varName}
                    </option>
                  ))}
                </Select>
              ) : condLeftType === 'number' ? (
                <Input
                  type="number"
                  step={1}
                  inputMode="decimal"
                  value={condLeftNumber}
                  onChange={(event) => setCondLeftNumber(event.target.value)}
                  placeholder="Left number"
                />
              ) : (
                <Input
                  value={condLeftString}
                  onChange={(event) => setCondLeftString(event.target.value)}
                  placeholder="Left text"
                />
              )}
            </div>

            <Select value={comparator} onChange={(event) => setComparator(event.target.value as ConditionOperator)}>
              {conditionComparators.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={condRightType}
                onChange={(event) => setCondRightType(event.target.value as ConditionOperandType)}
              >
                <option value="variable">right: variable</option>
                <option value="number">right: number</option>
                <option value="string">right: string</option>
              </Select>
              {condRightType === 'variable' ? (
                <Select value={condRightVar} onChange={(event) => setCondRightVar(event.target.value)}>
                  <option value="">Select variable</option>
                  {variableNames.map((varName) => (
                    <option key={varName} value={varName}>
                      {varName}
                    </option>
                  ))}
                </Select>
              ) : condRightType === 'number' ? (
                <Input
                  type="number"
                  step={1}
                  inputMode="decimal"
                  value={condRightNumber}
                  onChange={(event) => setCondRightNumber(event.target.value)}
                  placeholder="Right number"
                />
              ) : (
                <Input
                  value={condRightString}
                  onChange={(event) => setCondRightString(event.target.value)}
                  placeholder="Right text"
                />
              )}
            </div>

            <div className="rounded border border-border p-2">
              <div className="mb-1 text-[11px] font-medium text-muted">Then Value</div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={thenType} onChange={(event) => setThenType(event.target.value as OutputType)}>
                  <option value="variable">variable</option>
                  <option value="number">number</option>
                  <option value="string">string</option>
                </Select>
                {thenType === 'variable' ? (
                  <Select value={thenVar} onChange={(event) => setThenVar(event.target.value)}>
                    <option value="">Select variable</option>
                    {variableNames.map((varName) => (
                      <option key={varName} value={varName}>
                        {varName}
                      </option>
                    ))}
                  </Select>
                ) : thenType === 'number' ? (
                  <Input
                    type="number"
                    step={1}
                    inputMode="decimal"
                    value={thenNumber}
                    onChange={(event) => setThenNumber(event.target.value)}
                    placeholder="Then number"
                  />
                ) : (
                  <Input value={thenString} onChange={(event) => setThenString(event.target.value)} placeholder="Then text" />
                )}
              </div>
            </div>

            <div className="rounded border border-border p-2">
              <div className="mb-1 text-[11px] font-medium text-muted">Else Value</div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={elseType} onChange={(event) => setElseType(event.target.value as OutputType)}>
                  <option value="variable">variable</option>
                  <option value="number">number</option>
                  <option value="string">string</option>
                </Select>
                {elseType === 'variable' ? (
                  <Select value={elseVar} onChange={(event) => setElseVar(event.target.value)}>
                    <option value="">Select variable</option>
                    {variableNames.map((varName) => (
                      <option key={varName} value={varName}>
                        {varName}
                      </option>
                    ))}
                  </Select>
                ) : elseType === 'number' ? (
                  <Input
                    type="number"
                    step={1}
                    inputMode="decimal"
                    value={elseNumber}
                    onChange={(event) => setElseNumber(event.target.value)}
                    placeholder="Else number"
                  />
                ) : (
                  <Input value={elseString} onChange={(event) => setElseString(event.target.value)} placeholder="Else text" />
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-[11px] text-muted">
              <input
                type="checkbox"
                checked={conditionFreeze}
                onChange={(event) => setConditionFreeze(event.target.checked)}
              />
              Freeze first non-null value
            </label>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button size="sm" onClick={submit}>
            {editingName ? 'Update Variable' : 'Add Variable'}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>

        <div className="max-h-[360px] space-y-2 overflow-auto">
          {!variables.length ? (
            <div className="rounded-md border border-dashed border-border px-3 py-5 text-center text-sm text-muted">
              No variables yet.
            </div>
          ) : (
            variables.map((variable) => (
              <div key={variable.name} className="rounded-md border border-border bg-[#f9fbf7] px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">{variable.name}</div>
                    <div className="text-muted">
                      {variable.kind}
                      {'freeze' in variable && variable.freeze ? ' - frozen-once' : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {variable.kind !== 'session' ? (
                      <button
                        type="button"
                        className="text-accent"
                        onClick={() => startEdit(variable)}
                      >
                        Edit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => onVariablesChange(variables.filter((item) => item.name !== variable.name))}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
