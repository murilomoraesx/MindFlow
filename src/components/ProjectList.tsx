import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Plus, Folder, Clock, Trash2, X, Upload, Copy, Download, Route, ChevronLeft, Pencil, Map as MapIcon, FileText, Moon, Sun } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ProjectFolder, RecentMap } from '../types';
import { MapTemplateId, createMapFromTemplate, normalizeMapData } from '../utils/mapSchema';
import { downloadTextFile, exportMapToMarkdown, parseMarkdownToMap } from '../utils/mapExchange';
import { persistMapData } from '../utils/persistence';
import { apiCreateMap, apiCreateProject, apiDeleteMap, apiDeleteProject, apiGetMap, apiListMaps, apiListProjects, apiUpdateProject } from '../utils/serverApi';
import { AccountMenu } from './AccountMenu';

type TemplateOption = {
  id: MapTemplateId;
  title: string;
  description: string;
};

type DeleteTarget = { type: 'map'; id: string } | { type: 'project'; id: string };

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'blank',
    title: 'Mapa em branco',
    description: 'Estrutura limpa para começar do zero.',
  },
  {
    id: 'journey',
    title: 'Jornada marketing',
    description: 'Fluxo de aquisição, ativação, conversão e retenção.',
  },
  {
    id: 'swot',
    title: 'Análise SWOT',
    description: 'Forças, fraquezas, oportunidades e ameaças com subtópicos.',
  },
  {
    id: 'okr',
    title: 'OKRs trimestrais',
    description: 'Objetivos, resultados-chave e iniciativas conectadas.',
  },
  {
    id: 'roadmap',
    title: 'Roadmap de produto',
    description: 'Plano anual por trimestres com frentes de execução.',
  },
  {
    id: 'content',
    title: 'Plano de conteúdo 90 dias',
    description: 'Pilares de conteúdo, calendário e indicadores.',
  },
  {
    id: 'sales',
    title: 'Funil de vendas B2B',
    description: 'Etapas comerciais com playbook operacional.',
  },
];

export const ProjectList = () => {
  const [projects, setProjects] = useState<ProjectFolder[]>([]);
  const [recentMaps, setRecentMaps] = useState<RecentMap[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showNewMapModal, setShowNewMapModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newMapName, setNewMapName] = useState('');
  const [newMapTemplate, setNewMapTemplate] = useState<MapTemplateId>('blank');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme, setCurrentView, setEditorReturnView, loadMap, mapProjectId } = useFlowStore();

  useEffect(() => {
    const load = async () => {
      try {
        const [serverProjects, serverMaps] = await Promise.all([apiListProjects(), apiListMaps()]);
        setProjects(serverProjects.sort((a, b) => b.lastEdited - a.lastEdited));
        setRecentMaps(serverMaps.sort((a, b) => b.lastEdited - a.lastEdited));
        if (mapProjectId && serverProjects.some((project) => project.id === mapProjectId)) {
          setActiveProjectId(mapProjectId);
        }
      } catch (error) {
        console.error('Erro ao carregar projetos remotos:', error);
        setImportError(error instanceof Error ? error.message : 'Não foi possível carregar os projetos.');
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (showCreateProjectModal) {
      setTimeout(() => projectInputRef.current?.focus(), 0);
    }
  }, [showCreateProjectModal]);

  useEffect(() => {
    if (showNewMapModal) {
      setTimeout(() => mapInputRef.current?.focus(), 0);
    }
  }, [showNewMapModal]);

  const persistProjects = (nextProjects: ProjectFolder[]) => {
    setProjects(nextProjects.sort((a, b) => b.lastEdited - a.lastEdited));
  };

  const persistMaps = (nextMaps: RecentMap[]) => {
    setRecentMaps(nextMaps.sort((a, b) => b.lastEdited - a.lastEdited));
  };

  const upsertRecentMap = (meta: RecentMap) => {
    const nextMaps = [meta, ...recentMaps.filter((item) => item.id !== meta.id)].sort((a, b) => b.lastEdited - a.lastEdited);
    persistMaps(nextMaps);
  };

  const touchProject = (projectId: string, editedAt: number) => {
    const nextProjects = projects
      .map((project) => (project.id === projectId ? { ...project, lastEdited: editedAt } : project))
      .sort((a, b) => b.lastEdited - a.lastEdited);
    persistProjects(nextProjects);
  };

  const projectMapCount = useMemo(() => {
    const countByProject = new Map<string, number>();
    recentMaps.forEach((map) => {
      if (!map.projectId) return;
      countByProject.set(map.projectId, (countByProject.get(map.projectId) || 0) + 1);
    });
    return countByProject;
  }, [recentMaps]);

  const activeProject = useMemo(() => projects.find((project) => project.id === activeProjectId) || null, [projects, activeProjectId]);

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [projects, searchQuery],
  );

  const filteredMaps = useMemo(() => {
    if (!activeProjectId) return [];

    return recentMaps
      .filter((map) => map.projectId === activeProjectId)
      .filter((map) => map.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.lastEdited - a.lastEdited);
  }, [recentMaps, activeProjectId, searchQuery]);

  const handleOpenMap = (id: string) => {
    const run = async () => {
      try {
        const normalized = await apiGetMap(id);
        persistMapData(normalized, { forceBackup: true });
        const resolvedProjectId = normalized.projectId || activeProjectId || projects[0]?.id;
        loadMap({ ...normalized, projectId: resolvedProjectId });
        setEditorReturnView('projects');
        setCurrentView('editor');
        setImportError(null);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Não foi possível abrir este mapa.');
      }
    };
    void run();
  };

  const handleCreateProject = () => {
    const run = async () => {
      try {
        const project = await apiCreateProject({
          name: newProjectName.trim() || 'Novo Projeto',
          description: newProjectDescription.trim(),
        });
        persistProjects([project, ...projects]);
        setActiveProjectId(project.id);
        setShowCreateProjectModal(false);
        setNewProjectName('');
        setNewProjectDescription('');
        setSearchQuery('');
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Não foi possível criar o projeto.');
      }
    };
    void run();
  };

  const handleStartEditProject = (project: ProjectFolder) => {
    setEditingProjectId(project.id);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || '');
    setShowEditProjectModal(true);
  };

  const handleConfirmEditProject = () => {
    if (!editingProjectId) return;
    const trimmedName = editProjectName.trim();
    if (!trimmedName) return;
    const run = async () => {
      try {
        const updated = await apiUpdateProject(editingProjectId, {
          name: trimmedName,
          description: editProjectDescription.trim(),
        });
        persistProjects(projects.map((project) => (project.id === editingProjectId ? updated : project)));
        setShowEditProjectModal(false);
        setEditingProjectId(null);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Não foi possível editar o projeto.');
      }
    };
    void run();
  };

  const handleConfirmCreateMap = () => {
    if (!activeProjectId) return;
    const run = async () => {
      try {
        const selectedTemplate = TEMPLATE_OPTIONS.find((option) => option.id === newMapTemplate);
        const name = newMapName.trim() || selectedTemplate?.title || 'Novo Mapa Mental';
        const newId = uuidv4();
        const map = createMapFromTemplate(newMapTemplate, newId, name);
        const mapWithProject = { ...map, projectId: activeProjectId, lastEdited: Date.now() };
        await apiCreateMap(mapWithProject);
        persistMapData(mapWithProject, { forceBackup: true });
        upsertRecentMap({
          id: newId,
          name,
          lastEdited: mapWithProject.lastEdited,
          nodeCount: mapWithProject.nodes.length,
          projectId: activeProjectId,
        });
        touchProject(activeProjectId, mapWithProject.lastEdited);
        setShowNewMapModal(false);
        setNewMapName('');
        setNewMapTemplate('blank');
        loadMap(mapWithProject);
        setEditorReturnView('projects');
        setCurrentView('editor');
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Não foi possível criar o mapa.');
      }
    };
    void run();
  };

  const handleDeleteMap = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    setDeleteTarget({ type: 'map', id });
  };

  const handleDeleteProject = (projectId: string) => {
    setDeleteTarget({ type: 'project', id: projectId });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'project') {
      const run = async () => {
        try {
          const projectId = deleteTarget.id;
          await apiDeleteProject(projectId);
          const nextMaps = recentMaps.filter((map) => map.projectId !== projectId);
          const nextProjects = projects.filter((project) => project.id !== projectId);
          persistMaps(nextMaps);
          persistProjects(nextProjects);
          if (activeProjectId === projectId) {
            setActiveProjectId(null);
          }
          if (editingProjectId === projectId) {
            setShowEditProjectModal(false);
            setEditingProjectId(null);
          }
          setDeleteTarget(null);
        } catch (error) {
          setImportError(error instanceof Error ? error.message : 'Não foi possível excluir o projeto.');
        }
      };
      void run();
      return;
    }

    const run = async () => {
      try {
        const mapToDelete = recentMaps.find((map) => map.id === deleteTarget.id);
        await apiDeleteMap(deleteTarget.id);
        const nextMaps = recentMaps.filter((map) => map.id !== deleteTarget.id);
        persistMaps(nextMaps);
        if (mapToDelete?.projectId) {
          const latestMapDateInProject = nextMaps
            .filter((map) => map.projectId === mapToDelete.projectId)
            .reduce((max, map) => Math.max(max, map.lastEdited), Date.now());
          touchProject(mapToDelete.projectId, latestMapDateInProject);
        }
        setDeleteTarget(null);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Não foi possível excluir o mapa.');
      }
    };
    void run();
  };

  const handleDuplicateMap = (event: React.MouseEvent, map: RecentMap) => {
    event.stopPropagation();
    const run = async () => {
      try {
        const normalized = await apiGetMap(map.id);
        const duplicatedId = uuidv4();
        const duplicatedMap = {
          ...normalized,
          id: duplicatedId,
          name: `${normalized.name} (cópia)`,
          lastEdited: Date.now(),
          projectId: map.projectId || activeProjectId || projects[0]?.id,
        };
        await apiCreateMap(duplicatedMap);
        persistMapData(duplicatedMap, { forceBackup: true });
        upsertRecentMap({
          id: duplicatedId,
          name: duplicatedMap.name,
          lastEdited: duplicatedMap.lastEdited,
          nodeCount: duplicatedMap.nodes.length,
          projectId: duplicatedMap.projectId,
        });
        if (duplicatedMap.projectId) {
          touchProject(duplicatedMap.projectId, duplicatedMap.lastEdited);
        }
        setImportError(null);
      } catch (error) {
        console.error('Erro ao duplicar mapa:', error);
        setImportError('Não foi possível duplicar este mapa.');
      }
    };
    void run();
  };

  const handleExportMapJson = (event: React.MouseEvent, map: RecentMap) => {
    event.stopPropagation();
    const run = async () => {
      const mapData = await apiGetMap(map.id);
      downloadTextFile(`${map.name}.json`, JSON.stringify(mapData, null, 2), 'application/json;charset=utf-8');
    };
    void run();
  };

  const handleExportMapMarkdown = (event: React.MouseEvent, map: RecentMap) => {
    event.stopPropagation();
    const run = async () => {
      try {
        const normalized = await apiGetMap(map.id);
        const markdown = exportMapToMarkdown(normalized.name, normalized.nodes, normalized.edges);
        downloadTextFile(`${map.name}.md`, markdown, 'text/markdown;charset=utf-8');
      } catch (error) {
        console.error('Erro ao exportar markdown:', error);
        setImportError('Não foi possível exportar este mapa como Markdown.');
      }
    };
    void run();
  };

  const handleImportMap = () => {
    if (!activeProjectId) {
      setImportError('Abra um projeto para importar mapas para dentro dele.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.md,.markdown,text/markdown,text/plain';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        try {
          const content = String(loadEvent.target?.result || '');
          const fileName = file.name.toLowerCase();
          const isMarkdown = fileName.endsWith('.md') || fileName.endsWith('.markdown') || file.type.includes('markdown');
          const normalized = isMarkdown
            ? parseMarkdownToMap(content, file.name.replace(/\.[^.]+$/, ''))
            : normalizeMapData(JSON.parse(content));
          const newId = uuidv4();
          const importedMap = {
            ...normalized,
            id: newId,
            lastEdited: Date.now(),
            projectId: activeProjectId,
          };

          await apiCreateMap(importedMap);
          persistMapData(importedMap, { forceBackup: true });
          upsertRecentMap({
            id: newId,
            name: importedMap.name,
            lastEdited: importedMap.lastEdited,
            nodeCount: importedMap.nodes.length,
            projectId: activeProjectId,
          });

          touchProject(activeProjectId, importedMap.lastEdited);
          setImportError(null);
        } catch (error) {
          console.error('Erro ao importar mapa:', error);
          setImportError('Arquivo inválido. Use JSON MindFlow ou Markdown estruturado.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex h-full w-full flex-col items-center bg-slate-50 p-8 dark:bg-[#061223]">
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <button
              onClick={() => setShowCreateProjectModal(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">Criar Novo Projeto</h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">O projeto funciona como uma pasta para organizar seus mapas.</p>
            <input
              ref={projectInputRef}
              type="text"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateProject();
              }}
              placeholder="Ex: Produto 2026, Clientes Enterprise"
              className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400"
            />
            <textarea
              rows={3}
              value={newProjectDescription}
              onChange={(event) => setNewProjectDescription(event.target.value)}
              placeholder="Descrição do projeto (opcional)"
              className="mb-6 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateProjectModal(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProject}
                className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                Criar Projeto
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <button
              onClick={() => setShowEditProjectModal(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">Editar Projeto</h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Altere nome e descrição da pasta do projeto.</p>
            <input
              type="text"
              value={editProjectName}
              onChange={(event) => setEditProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleConfirmEditProject();
              }}
              placeholder="Nome do projeto"
              className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400"
            />
            <textarea
              rows={3}
              value={editProjectDescription}
              onChange={(event) => setEditProjectDescription(event.target.value)}
              placeholder="Descrição do projeto (opcional)"
              className="mb-6 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (editingProjectId) {
                    setShowEditProjectModal(false);
                    handleDeleteProject(editingProjectId);
                  }
                }}
                className="rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                title="Excluir projeto"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setShowEditProjectModal(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmEditProject}
                className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <button
              onClick={() => setShowNewMapModal(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">Novo Mapa</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Escolha um template completo para acelerar seu trabalho.</p>
            <input
              ref={mapInputRef}
              type="text"
              value={newMapName}
              onChange={(event) => setNewMapName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleConfirmCreateMap();
              }}
              placeholder="Nome do mapa"
              className="mb-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-400"
            />

            <div className="mb-6 grid grid-cols-1 gap-2 md:grid-cols-2">
              {TEMPLATE_OPTIONS.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setNewMapTemplate(template.id)}
                  className={`rounded-lg border px-3 py-3 text-left text-xs transition-colors ${
                    newMapTemplate === template.id
                      ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-sm font-semibold">{template.title}</div>
                  <div className="mt-1 text-xs opacity-80">{template.description}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowNewMapModal(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCreateMap}
                className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                Criar Mapa
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
              {deleteTarget.type === 'project' ? 'Excluir Projeto' : 'Excluir Mapa'}
            </h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              {deleteTarget.type === 'project'
                ? 'Tem certeza que deseja excluir este projeto? Todos os mapas dentro dele serão apagados.'
                : 'Tem certeza que deseja excluir este mapa? Esta ação não pode ser desfeita.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl">
        <div className="mb-12 flex items-center justify-between">
          <div>
            {activeProject ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveProjectId(null);
                    setSearchQuery('');
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Voltar aos projetos"
                >
                  <ChevronLeft size={16} />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{activeProject.name}</h1>
                  {activeProject.description ? (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{activeProject.description}</p>
                  ) : null}
                  <p className="mt-2 text-slate-500 dark:text-slate-400">{projectMapCount.get(activeProject.id) || 0} mapas neste projeto.</p>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Meus Projetos</h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400">Organize seus mapas em pastas de projeto.</p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <AccountMenu />
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {activeProject && (
              <button
                onClick={() => handleStartEditProject(activeProject)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Pencil size={16} />
                Editar Projeto
              </button>
            )}
            {activeProject && (
              <button
                onClick={handleImportMap}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Upload size={18} />
                Importar JSON/MD
              </button>
            )}
            <button
              onClick={() => {
                if (activeProject) {
                  setNewMapName('');
                  setNewMapTemplate('blank');
                  setShowNewMapModal(true);
                } else {
                  setNewProjectName('');
                  setNewProjectDescription('');
                  setShowCreateProjectModal(true);
                }
              }}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
            >
              <Plus size={18} />
              {activeProject ? 'Novo Mapa' : 'Criar Novo Projeto'}
            </button>
          </div>
        </div>

        {importError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {importError}
          </div>
        )}

        {(activeProject ? filteredMaps.length > 0 : filteredProjects.length > 0) && (
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={activeProject ? 'Buscar mapas...' : 'Buscar projetos...'}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-violet-400"
            />
          </div>
        )}

        {!activeProject ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-24 dark:border-slate-800">
                <Folder size={48} className="mb-4 text-slate-300 dark:text-slate-700" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Nenhum projeto ainda</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crie uma pasta de projeto para organizar seus mapas mentais.</p>
                <button
                  onClick={() => {
                    setNewProjectName('');
                    setNewProjectDescription('');
                    setShowCreateProjectModal(true);
                  }}
                  className="mt-6 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                >
                  Criar novo projeto &rarr;
                </button>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => {
                    setActiveProjectId(project.id);
                    setSearchQuery('');
                  }}
                  className="group relative flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-violet-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-500"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                    <Folder size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{project.name}</h3>
                  {project.description ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{project.description}</p> : null}

                  <div className="mt-auto flex items-center justify-between pt-6 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} />
                      <span>{new Date(project.lastEdited).toLocaleDateString()}</span>
                    </div>
                    <span>{projectMapCount.get(project.id) || 0} mapas</span>
                  </div>

                  <div className="mt-3 inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-300">
                    <Route size={10} />
                    Pasta de projeto
                  </div>

                  <div className="absolute right-4 top-4 hidden items-center gap-1 group-hover:flex">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleStartEditProject(project);
                      }}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      title="Editar projeto"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMaps.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-24 dark:border-slate-800">
                <MapIcon size={48} className="mb-4 text-slate-300 dark:text-slate-700" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Nenhum mapa neste projeto</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crie um novo mapa a partir de um template pronto.</p>
                <button
                  onClick={() => {
                    setNewMapName('');
                    setNewMapTemplate('blank');
                    setShowNewMapModal(true);
                  }}
                  className="mt-6 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                >
                  + Novo mapa &rarr;
                </button>
              </div>
            ) : (
              filteredMaps.map((map) => (
                <div
                  key={map.id}
                  onClick={() => handleOpenMap(map.id)}
                  className="group relative flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-violet-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-500"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                    <MapIcon size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{map.name}</h3>

                  <div className="mt-auto flex items-center justify-between pt-6 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} />
                      <span>{new Date(map.lastEdited).toLocaleDateString()}</span>
                    </div>
                    <span>{map.nodeCount} nós</span>
                  </div>

                  <div className="absolute right-4 top-4 hidden items-center gap-1 group-hover:flex">
                    <button
                      onClick={(event) => handleExportMapJson(event, map)}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      title="Exportar JSON"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={(event) => handleExportMapMarkdown(event, map)}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      title="Exportar Markdown"
                    >
                      <FileText size={14} />
                    </button>
                    <button
                      onClick={(event) => handleDuplicateMap(event, map)}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      title="Duplicar"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={(event) => handleDeleteMap(event, map.id)}
                      className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mt-3 inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-300">
                    <Route size={10} />
                    Local-first
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
