import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Eye, ShieldOff, ShieldCheck, Users, FolderKanban, Workflow, RefreshCcw } from 'lucide-react';
import { useFlowStore } from '../store/useFlowStore';
import { apiCreateClient, apiGetAdminMap, apiListClientMaps, apiListClients, apiRestoreClient, apiRevokeClient } from '../utils/serverApi';
import type { AuthUser, RecentMap } from '../types';

type ClientSummary = AuthUser & {
  projectCount: number;
  mapCount: number;
};

export const AdminPanel = () => {
  const { setCurrentView, setEditorReturnView, loadMap } = useFlowStore();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientMaps, setSelectedClientMaps] = useState<RecentMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'client' | 'collaborator'>('client');

  const selectedClient = useMemo(() => clients.find((client) => client.id === selectedClientId) || null, [clients, selectedClientId]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const nextClients = await apiListClients();
      setClients(nextClients);
      setError('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  };

  const loadClientMaps = async (clientId: string) => {
    try {
      const maps = await apiListClientMaps(clientId);
      setSelectedClientMaps(maps);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Não foi possível carregar os mapas deste cliente.');
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  useEffect(() => {
    if (!selectedClientId) {
      setSelectedClientMaps([]);
      return;
    }
    void loadClientMaps(selectedClientId);
  }, [selectedClientId]);

  const handleCreateClient = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiCreateClient({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      setShowCreate(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('client');
      await loadClients();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Não foi possível criar o acesso.');
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 dark:bg-[#061223]">
      <div className="border-b border-slate-200/80 bg-white/88 px-6 py-4 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/80">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('projects')}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/72 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800/80 dark:bg-slate-900/62 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-500">Admin</div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Painel administrativo</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadClients()}
              className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/72 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800/80 dark:bg-slate-900/62 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCcw size={15} />
              Atualizar
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
            >
              Liberar acesso
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 gap-6 px-6 py-6">
        <div className="flex min-h-0 w-[380px] flex-col rounded-[28px] border border-slate-200/80 bg-white/88 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/78">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Users size={14} /> Clientes</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{clients.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><FolderKanban size={14} /> Projetos</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{clients.reduce((total, client) => total + client.projectCount, 0)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Workflow size={14} /> Mapas</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{clients.reduce((total, client) => total + client.mapCount, 0)}</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {loading ? (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                Carregando clientes...
              </div>
            ) : clients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200/80 px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Nenhum cliente ou colaborador cadastrado ainda.
              </div>
            ) : (
              clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`w-full rounded-[24px] border px-4 py-4 text-left transition-colors ${
                    selectedClientId === client.id
                      ? 'border-violet-300 bg-violet-50/90 dark:border-violet-500/30 dark:bg-violet-500/10'
                      : 'border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/46 dark:hover:bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{client.name}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">{client.email}</div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${client.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300'}`}>
                      {client.status === 'active' ? 'Ativo' : 'Revogado'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{client.role}</span>
                    <span>{client.projectCount} projetos</span>
                    <span>{client.mapCount} mapas</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/78">
          {selectedClient ? (
            <>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-500">{selectedClient.role}</div>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{selectedClient.name}</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{selectedClient.email}</p>
                </div>
                <div className="flex gap-2">
                  {selectedClient.status === 'active' ? (
                    <button
                      onClick={async () => {
                        await apiRevokeClient(selectedClient.id);
                        await loadClients();
                      }}
                      className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                    >
                      <ShieldOff size={15} />
                      Revogar acesso
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await apiRestoreClient(selectedClient.id);
                        await loadClients();
                      }}
                      className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                    >
                      <ShieldCheck size={15} />
                      Restaurar acesso
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Mapas do cliente</div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {selectedClientMaps.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200/80 px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Este usuário ainda não criou mapas.
                  </div>
                ) : (
                  selectedClientMaps.map((map) => (
                    <div key={map.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/46">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{map.name}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {map.nodeCount} nós • {new Date(map.lastEdited).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const fullMap = await apiGetAdminMap(map.id);
                          loadMap(fullMap);
                          setEditorReturnView('admin');
                          setCurrentView('editor');
                        }}
                        className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/72 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800/80 dark:bg-slate-900/62 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Eye size={14} />
                        Abrir mapa
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200/80 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Selecione um cliente para ver mapas, restaurar ou revogar acessos.
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 backdrop-blur-sm">
          <form onSubmit={handleCreateClient} className="w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white/94 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)] dark:border-slate-800/80 dark:bg-slate-900/94">
            <div className="mb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-500">Admin</div>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Liberar novo acesso</h3>
            </div>
            <div className="space-y-3">
              <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nome" className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950/70" />
              <input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="E-mail" className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950/70" />
              <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Senha temporária" className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950/70" />
              <div className="grid grid-cols-2 gap-2">
                {(['client', 'collaborator'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setNewRole(role)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${newRole === role ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300' : 'border-slate-200 bg-slate-50/80 text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300'}`}
                  >
                    {role === 'client' ? 'Cliente' : 'Colaborador'}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300">
                Cancelar
              </button>
              <button type="submit" className="flex-1 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white">
                Criar acesso
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="fixed bottom-5 right-5 z-[150] rounded-2xl border border-rose-200 bg-white/94 px-4 py-3 text-sm text-rose-700 shadow-lg dark:border-rose-500/20 dark:bg-slate-900/94 dark:text-rose-300">
          {error}
        </div>
      )}
    </div>
  );
};
