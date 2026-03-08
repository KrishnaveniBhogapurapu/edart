import { ComputedCandle, VariableConfig } from '@candle/engine';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../app/layout/AppShell';
import { useAuthStore } from '../app/store/authStore';
import { useUIStore } from '../app/store/uiStore';
import { useWorkspaceStore } from '../app/store/workspaceStore';
import { CandleTable } from '../components/candles/CandleTable';
import { InspectorDrawer } from '../components/candles/InspectorDrawer';
import { SessionConfigPanel } from '../components/session/SessionConfigPanel';
import { ExcelUploadPanel } from '../components/upload/ExcelUploadPanel';
import { VariableBuilder } from '../components/variables/VariableBuilder';
import { ZerodhaPanel } from '../components/zerodha/ZerodhaPanel';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { api } from '../lib/api';
import { API_BASE_URL, APP_NAME } from '../lib/constants';
import { connectSessionStream } from '../lib/sse';

type DashboardPanel = 'config' | 'variables';

interface VariableCollectionSummary {
  id: string;
  name: string;
  variablesCount: number;
  updatedAt: string;
  isActive: boolean;
}

function operandLabel(operand: unknown): string {
  if (!operand || typeof operand !== 'object') {
    return 'null';
  }

  const typed = operand as { type?: string; name?: string; value?: unknown };
  if (typed.type === 'variable') {
    return typed.name ?? '?';
  }

  if (typeof typed.value === 'string') {
    return `"${typed.value}"`;
  }

  return String(typed.value ?? 'null');
}

function describeVariable(variable: VariableConfig): string {
  if (variable.kind === 'base') {
    return `${variable.aggregation}(${variable.source}, N=${variable.windowSize}, exclude=${variable.excludeRecent ?? 1})${variable.freeze ? ' [freeze]' : ''}`;
  }

  if (variable.kind === 'derived') {
    return `${operandLabel(variable.left)} ${variable.operator} ${operandLabel(variable.right)}${variable.freeze ? ' [freeze]' : ''}`;
  }

  if (variable.kind === 'condition') {
    return `if ${operandLabel(variable.left)} ${variable.comparator} ${operandLabel(variable.right)} then ${operandLabel(variable.thenValue)} else ${operandLabel(variable.elseValue)}${variable.freeze ? ' [freeze]' : ''}`;
  }

  return 'session snapshot (legacy)';
}

export function DashboardPage() {
  const logout = useAuthStore((state) => state.logout);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const config = useWorkspaceStore((state) => state.config);
  const status = useWorkspaceStore((state) => state.status);
  const rows = useWorkspaceStore((state) => state.rows);
  const errors = useWorkspaceStore((state) => state.errors);
  const fetchWorkspace = useWorkspaceStore((state) => state.fetchWorkspace);
  const saveWorkspace = useWorkspaceStore((state) => state.saveWorkspace);
  const setRows = useWorkspaceStore((state) => state.setRows);
  const appendRows = useWorkspaceStore((state) => state.appendRows);
  const setStatus = useWorkspaceStore((state) => state.setStatus);
  const setErrors = useWorkspaceStore((state) => state.setErrors);

  const selectedRowIndex = useUIStore((state) => state.selectedRowIndex);
  const setSelectedRowIndex = useUIStore((state) => state.setSelectedRowIndex);
  const streamState = useUIStore((state) => state.streamState);
  const setStreamState = useUIStore((state) => state.setStreamState);
  const setStreamError = useUIStore((state) => state.setStreamError);

  const [activePanel, setActivePanel] = useState<DashboardPanel>('variables');
  const [collections, setCollections] = useState<VariableCollectionSummary[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    void fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    if (!accessToken || config.mode === 'EXCEL') {
      return;
    }

    setStreamState('idle');
    const stop = connectSessionStream(API_BASE_URL, accessToken, {
      onOpen() {
        setStreamState('connected');
      },
      onStatus(payload) {
        const typed = payload as { status?: { realTime?: string; systemTime?: string } };
        setStatus(typed.status ?? {});
      },
      onSnapshot(payload) {
        setRows(payload as ComputedCandle[]);
      },
      onDelta(payload) {
        appendRows(payload as ComputedCandle[]);
      },
      onEngineError(payload) {
        const typed = payload as string[];
        setErrors(Array.isArray(typed) ? typed : ['Engine error']);
      },
      onError(error) {
        setStreamState('error');
        setStreamError(error instanceof Error ? error.message : 'Streaming failed');
      },
    });

    return () => stop();
  }, [accessToken, appendRows, config.mode, setErrors, setRows, setStatus, setStreamError, setStreamState]);

  const selectedRow = useMemo(
    () => (selectedRowIndex === null ? null : rows[selectedRowIndex] ?? null),
    [rows, selectedRowIndex],
  );

  const variableSummary = useMemo(
    () =>
      config.variables.map((variable) => ({
        name: variable.name,
        kind: variable.kind,
        description: describeVariable(variable),
      })),
    [config.variables],
  );
  const activeCollection = useMemo(
    () => collections.find((collection) => collection.isActive) ?? null,
    [collections],
  );

  const saveConfig = async (next: Partial<typeof config>) => {
    await saveWorkspace(next);
  };

  const fetchCollections = async () => {
    const response = await api.get('/variables/collections');
    const items = (response.data?.items ?? []) as VariableCollectionSummary[];
    const activeId = (response.data?.activeCollectionId as string | null) ?? '';
    setCollections(items);
    setSelectedCollectionId(activeId || items[0]?.id || '');
  };

  const handleVariablesChange = async (variables: VariableConfig[]) => {
    if (!selectedCollectionId) {
      setErrors(['Create/select a collection before adding variables.']);
      return;
    }

    const validation = await api.post('/variables/validate', { variables });
    if (!validation.data.ok) {
      setErrors(validation.data.errors);
      return;
    }

    setErrors([]);
    await api.patch(`/variables/collections/${selectedCollectionId}`, { variables });
    await fetchWorkspace();
    await fetchCollections();
  };

  const createCollection = async () => {
    const trimmed = newCollectionName.trim();
    if (!trimmed) {
      return;
    }
    await api.post('/variables/collections', {
      name: trimmed,
    });
    setNewCollectionName('');
    setIsCreatingCollection(false);
    await fetchWorkspace();
    await fetchCollections();
  };

  const activateCollection = async (collectionId: string) => {
    if (!collectionId) {
      return;
    }
    await api.post(`/variables/collections/${collectionId}/activate`);
    await fetchWorkspace();
    await fetchCollections();
  };

  const deleteCollection = async (collectionId: string) => {
    if (!collectionId) {
      return;
    }
    await api.delete(`/variables/collections/${collectionId}`);
    await fetchWorkspace();
    await fetchCollections();
  };

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void (async () => {
      await fetchCollections();
      await fetchWorkspace();
    })();
  }, [accessToken]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">{APP_NAME}</h1>
              <p className="text-xs text-muted">Candle-based rolling computation workspace</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>Real Time (IST): {status.realTime ?? '--:--:--'}</Badge>
              <Badge>System Time (IST): {status.systemTime ?? '--:--:--'}</Badge>
              <Badge>Stream: {streamState}</Badge>
              <Badge>Zerodha: {(config.api?.user_id as string) ? 'configured' : 'not configured'}</Badge>
              <Badge>
                Instrument: {(config.api?.tradingsymbol as string) ?? (config.api?.instrumentToken as string) ?? '--'}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={() => void logout()}>
                Logout
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="space-y-3 xl:col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Workspace Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={activePanel === 'config' ? 'default' : 'outline'}
                    onClick={() => setActivePanel('config')}
                  >
                    Config
                  </Button>
                  <Button
                    size="sm"
                    variant={activePanel === 'variables' ? 'default' : 'outline'}
                    onClick={() => setActivePanel('variables')}
                  >
                    Variables
                  </Button>
                </div>
              </CardContent>
            </Card>

            {activePanel === 'config' ? (
              <div className="space-y-3">
                <SessionConfigPanel config={config} onSave={(next) => void saveConfig(next)} />
                {config.mode === 'API' ? (
                  <ZerodhaPanel
                    apiConfig={(config.api ?? {}) as Record<string, unknown>}
                    onApiConfigChange={(next) => void saveConfig({ api: next })}
                  />
                ) : null}
                {config.mode === 'EXCEL' ? (
                  <ExcelUploadPanel
                    variables={config.variables}
                    onRowsProcessed={(nextRows) => setRows(nextRows as ComputedCandle[])}
                  />
                ) : null}
              </div>
            ) : null}

            {activePanel === 'variables' ? (
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Variable Collections</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted">Available collections</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsCreatingCollection((prev) => !prev)}
                      >
                        + New Collection
                      </Button>
                    </div>
                    {isCreatingCollection ? (
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                        <Input
                          value={newCollectionName}
                          onChange={(event) => setNewCollectionName(event.target.value)}
                          placeholder="Collection name"
                        />
                        <Button size="sm" onClick={() => void createCollection()}>
                          Create
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIsCreatingCollection(false);
                            setNewCollectionName('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : null}
                    <div className="max-h-40 space-y-2 overflow-auto rounded-md border border-border p-2">
                      {collections.length ? (
                        collections.map((collection) => (
                          <div
                            key={collection.id}
                            className="flex items-center justify-between rounded-md border border-border bg-[#f8faf7] px-2 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{collection.name}</div>
                              <div className="text-[11px] text-muted">{collection.variablesCount} variables</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {collection.isActive ? (
                                <Badge>Active</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void activateCollection(collection.id)}
                                >
                                  Use
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void deleteCollection(collection.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted">No collections yet.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {selectedCollectionId ? (
                  <div className="space-y-2">
                    <Card>
                      <CardContent className="space-y-2 py-3">
                        <div className="text-xs font-medium text-muted">Working Collection</div>
                        <Select
                          value={selectedCollectionId}
                          onChange={(event) => {
                            const nextId = event.target.value;
                            setSelectedCollectionId(nextId);
                            void activateCollection(nextId);
                          }}
                        >
                          <option value="">Select collection</option>
                          {collections.map((collection) => (
                            <option key={collection.id} value={collection.id}>
                              {collection.name}
                              {collection.isActive ? ' [active]' : ''}
                              {` (${collection.variablesCount})`}
                            </option>
                          ))}
                        </Select>
                      </CardContent>
                    </Card>
                    <VariableBuilder
                      variables={config.variables}
                      onVariablesChange={(next) => void handleVariablesChange(next)}
                    />
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-4 text-xs text-muted">
                      Create a collection first, then add variables inside it.
                    </CardContent>
                  </Card>
                )}
                {errors.length ? (
                  <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {errors.map((error) => (
                      <div key={error}>{error}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

          </div>

          <div className="space-y-3 xl:col-span-9">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Active Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge>Mode: {config.mode}</Badge>
                  <Badge>Interval: {config.interval}</Badge>
                  <Badge>Anchor: {config.session.anchorRealTime ? 'configured' : 'not set'}</Badge>
                  <Badge>Collection: {activeCollection?.name ?? '--'}</Badge>
                  <Badge>Variables: {config.variables.length}</Badge>
                  <Badge>
                    Instrument: {(config.api?.tradingsymbol as string) ?? (config.api?.instrumentToken as string) ?? '--'}
                  </Badge>
                  <Badge>
                    Date: {(config.api?.dateFrom as string) ?? '--'} to {(config.api?.dateTo as string) ?? '--'}
                  </Badge>
                </div>

                <div className="max-h-28 space-y-1 overflow-auto rounded-md border border-border bg-[#f8faf7] p-2">
                  {!variableSummary.length ? (
                    <div className="text-xs text-muted">No variables configured yet.</div>
                  ) : (
                    variableSummary.map((item) => (
                      <div key={item.name} className="text-xs">
                        <span className="font-semibold">{item.name}</span>
                        <span className="ml-2 text-muted">[{item.kind}] {item.description}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <CandleTable rows={rows} onRowClick={setSelectedRowIndex} />

            {selectedRow ? (
              <InspectorDrawer row={selectedRow} />
            ) : (
              <Card>
                <CardContent className="py-3 text-xs text-muted">
                  Click any candle row to inspect exact calculation traces.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
