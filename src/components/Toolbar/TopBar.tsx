import { useFlowStore } from '../../store/useFlowStore';
import { Undo2, Redo2, Download, Moon, Sun, Menu, Save, ChevronLeft, ChevronDown, ChevronUp, SlidersHorizontal, Palette, Map, PanelRight, LayoutTemplate, MonitorPlay, HelpCircle, PanelLeft, PanelLeftClose, MousePointer2, Command, Rows3, History, FileText, GitBranch, PanelsLeftRight, AlignStartVertical, AlignStartHorizontal, BetweenHorizontalStart, Focus, Search, Network, ListTree, Share2, RotateCcw, Play, Pause, Zap } from 'lucide-react';
import type { EdgeAnimationStyle, LayoutType } from '../../types';
import { exportFlowToPdf } from '../../utils/export';
import { downloadTextFile, exportMapToMarkdown } from '../../utils/mapExchange';
import { SHARED_COLOR_PALETTE } from '../../utils/colors';
import { useEffect, useMemo, useRef, useState } from 'react';

const CANVAS_POINTER_EVENT = 'mindflow:canvas-pointerdown';

export const TopBar = () => {
  const {
    mapName,
    setMapName,
    undo,
    redo,
    theme,
    setTheme,
    setCurrentView,
    showMinimap,
    setShowMinimap,
    showStylePanel,
    setShowStylePanel,
    cleanMode,
    setCleanMode,
    focusModeEnabled,
    setFocusModeEnabled,
    structurePanelOpen,
    setStructurePanelOpen,
    selectionModeEnabled,
    setSelectionModeEnabled,
    autoLayout,
    autoLayoutSubtree,
    layoutType,
    settings,
    setSettings,
    startPresentation,
    saveStatus,
    setShowShortcutsModal,
    setShowCommandPalette,
    showHistoryPanel,
    setShowHistoryPanel,
    sidebarCollapsed,
    setSidebarCollapsed,
    nodes,
    edges,
    setNodes,
    setEdges,
    pushHistory,
    setSaveStatus,
  } = useFlowStore();
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showEdgeFlowMenu, setShowEdgeFlowMenu] = useState(false);
  const [showGlobalFlowColors, setShowGlobalFlowColors] = useState(false);
  const layoutMenuRef = useRef<HTMLDivElement>(null);
  const edgeFlowMenuRef = useRef<HTMLDivElement>(null);

  const selectedNodes = useMemo(() => nodes.filter((node) => node.selected), [nodes]);
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const globalEdgeColor = useMemo(() => {
    if (edges.length === 0) return undefined;
    const [firstEdge] = edges;
    const firstColor = firstEdge?.data?.color as string | undefined;
    return edges.every((edge) => (edge.data?.color as string | undefined) === firstColor) ? firstColor : null;
  }, [edges]);
  const globalEdgeVariant = useMemo(() => {
    if (edges.length === 0) return 'glow';
    const [firstEdge] = edges;
    const firstVariant = (firstEdge?.data?.variant as 'solid' | 'dashed' | 'glow' | undefined) || 'glow';
    return edges.every((edge) => ((edge.data?.variant as 'solid' | 'dashed' | 'glow' | undefined) || 'glow') === firstVariant)
      ? firstVariant
      : null;
  }, [edges]);
  const globalEdgeThickness = useMemo(() => {
    if (edges.length === 0) return '2';
    const [firstEdge] = edges;
    const firstThickness = String(firstEdge?.data?.thickness || '2');
    return edges.every((edge) => String(edge.data?.thickness || '2') === firstThickness) ? firstThickness : null;
  }, [edges]);

  useEffect(() => {
    if (!showLayoutMenu) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (layoutMenuRef.current?.contains(event.target as Node)) return;
      setShowLayoutMenu(false);
    };
    const handleCanvasPointer = () => {
      setShowLayoutMenu(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener(CANVAS_POINTER_EVENT, handleCanvasPointer);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener(CANVAS_POINTER_EVENT, handleCanvasPointer);
    };
  }, [showLayoutMenu]);

  useEffect(() => {
    if (!showEdgeFlowMenu) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (edgeFlowMenuRef.current?.contains(event.target as Node)) return;
      setShowEdgeFlowMenu(false);
    };
    const handleCanvasPointer = () => {
      setShowEdgeFlowMenu(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener(CANVAS_POINTER_EVENT, handleCanvasPointer);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener(CANVAS_POINTER_EVENT, handleCanvasPointer);
    };
  }, [showEdgeFlowMenu]);

  const LAYOUT_OPTIONS: { id: LayoutType; label: string; icon: typeof Share2 }[] = [
    { id: 'mindmap', label: 'Mapa mental', icon: Share2 },
    { id: 'orgchart', label: 'Organograma', icon: Network },
    { id: 'list', label: 'Lista', icon: ListTree },
  ];
  const EDGE_ANIMATION_OPTIONS: { id: EdgeAnimationStyle; label: string; desc: string }[] = [
    { id: 'energy', label: 'Energia', desc: 'Brilho vivo correndo na linha' },
    { id: 'subtle', label: 'Sutil', desc: 'Pacotes finos e discretos no fluxo' },
    { id: 'tech', label: 'Tech', desc: 'Pulsos elétricos mais tecnológicos' },
  ];
  const handleExportPDF = async () => {
    try {
      await exportFlowToPdf(mapName, theme);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  const handleExportMarkdown = () => {
    const markdown = exportMapToMarkdown(mapName, nodes, edges);
    const safeMapName = mapName?.trim() || 'mindmap';
    downloadTextFile(`${safeMapName}.md`, markdown, 'text/markdown;charset=utf-8');
  };

  const handleAlignSelection = (axis: 'x' | 'y') => {
    if (selectedNodes.length < 2) return;
    const anchor =
      axis === 'x'
        ? Math.min(...selectedNodes.map((node) => node.position.x))
        : Math.min(...selectedNodes.map((node) => node.position.y));
    pushHistory();
    setSaveStatus('unsaved');
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.selected
          ? {
              ...node,
              position: {
                x: axis === 'x' ? anchor : node.position.x,
                y: axis === 'y' ? anchor : node.position.y,
              },
            }
          : node,
      ),
    );
  };

  const handleDistributeSelection = () => {
    if (selectedNodes.length < 3) return;
    const ordered = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
    const top = ordered[0].position.y;
    const bottom = ordered[ordered.length - 1].position.y;
    const step = (bottom - top) / (ordered.length - 1 || 1);
    const positionById = new Map(ordered.map((node, index) => [node.id, top + step * index]));
    pushHistory();
    setSaveStatus('unsaved');
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        positionById.has(node.id)
          ? {
              ...node,
              position: {
                ...node.position,
                y: positionById.get(node.id) || node.position.y,
              },
            }
          : node,
      ),
    );
  };

  const handleApplyLayout = (nextLayoutType: LayoutType) => {
    autoLayout({ layoutType: nextLayoutType, recordHistory: true });
    setShowLayoutMenu(false);
  };

  const handleToggleAutoLayoutOnInsert = () => {
    const enabled = !settings.autoLayoutOnInsert;
    setSettings({ autoLayoutOnInsert: enabled });
    if (enabled) {
      autoLayout({ recordHistory: true });
    }
  };

  const handleResetCanvasLayout = () => {
    autoLayout({ recordHistory: true, fitView: true });
    setShowLayoutMenu(false);
  };

  const handleToggleEdgeAnimations = () => {
    setSettings({ edgeAnimationsEnabled: !settings.edgeAnimationsEnabled });
    setSaveStatus('unsaved');
  };

  const handleApplyEdgeAnimationStyle = (style: EdgeAnimationStyle) => {
    setSettings({ edgeAnimationStyle: style });
    pushHistory();
    setSaveStatus('unsaved');
    setEdges((currentEdges) =>
      currentEdges.map((edge) =>
        edge.type === 'animated' || !edge.type
          ? {
              ...edge,
              data: {
                ...edge.data,
                animationStyle: style,
              },
            }
          : edge,
      ),
    );
    setShowEdgeFlowMenu(false);
  };

  const handleApplyGlobalEdgeColor = (color?: string) => {
    pushHistory();
    setSaveStatus('unsaved');
    setEdges((currentEdges) =>
      currentEdges.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          color,
        },
      })),
    );
  };

  const handleApplyGlobalEdgeThickness = (thickness: string) => {
    pushHistory();
    setSaveStatus('unsaved');
    setEdges((currentEdges) =>
      currentEdges.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          thickness,
        },
      })),
    );
  };

  const handleApplyGlobalEdgeVariant = (variant: 'solid' | 'dashed' | 'glow') => {
    pushHistory();
    setSaveStatus('unsaved');
    setEdges((currentEdges) =>
      currentEdges.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          variant,
        },
      })),
    );
  };

  return (
    <div className="mf-toolbar relative z-50 flex h-14 w-full items-center justify-between border-b border-slate-200/80 bg-white/88 px-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/82 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentView('projects')}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Voltar aos Projetos"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title={sidebarCollapsed ? "Expandir Painel" : "Recolher Painel"}
        >
          {sidebarCollapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
        <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Menu size={16} />
        </div>
        <input
          type="text"
          value={mapName}
          onChange={(e) => setMapName(e.target.value)}
          className="bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          placeholder="Sem título"
        />
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
          <Save size={10} className={saveStatus === 'saving' ? 'animate-pulse text-amber-400' : saveStatus === 'saved' ? 'text-emerald-400' : 'text-slate-400'} />
          <span>{saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'saved' ? 'Salvo' : 'Não salvo'}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={undo}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={redo}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Refazer (Ctrl+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>

        <div className="mx-2 h-4 w-px bg-slate-200 dark:bg-slate-800" />

        <div className="relative" ref={layoutMenuRef}>
          <button
            onClick={() => {
              setShowLayoutMenu((prev: boolean) => !prev);
              setShowEdgeFlowMenu(false);
            }}
            className={`flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors ${showLayoutMenu ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
            title="Layout"
          >
            <LayoutTemplate size={14} />
            <span>Layout</span>
          </button>
          {showLayoutMenu && (
            <div className="mf-theme-menu absolute left-0 top-10 z-[100] w-[220px] rounded-2xl border p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Layout</span>
              </div>

              <label className="mb-3 flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.autoLayoutOnInsert}
                    onChange={handleToggleAutoLayoutOnInsert}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-slate-200 transition-colors peer-checked:bg-violet-500 dark:bg-slate-700 dark:peer-checked:bg-violet-500" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Alinhamento automático</span>
              </label>

              <div className="flex flex-col gap-1">
                {LAYOUT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = layoutType === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleApplyLayout(option.id)}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                    >
                      <Icon size={15} className={isActive ? 'text-violet-500' : 'text-slate-400 dark:text-slate-500'} />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {selectedNode && (
                <>
                  <div className="my-2 h-px bg-slate-200 dark:bg-slate-700" />
                  <button
                    onClick={() => {
                      autoLayoutSubtree(selectedNode.id);
                      setShowLayoutMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <Rows3 size={15} className="text-slate-400 dark:text-slate-500" />
                    Organizar subárvore
                  </button>
                </>
              )}

              <div className="my-2 h-px bg-slate-200 dark:bg-slate-700" />
              <button
                onClick={handleResetCanvasLayout}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
              >
                <RotateCcw size={15} className="text-slate-400 dark:text-slate-500" />
                Resetar canvas
              </button>
            </div>
          )}
        </div>

        <button
          onClick={startPresentation}
          className="flex h-7 items-center gap-1.5 rounded px-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Apresentar (Cmd/Ctrl+Shift+P)"
        >
          <MonitorPlay size={14} />
          <span className="text-xs font-medium">Apresentar</span>
        </button>

        <div className="relative" ref={edgeFlowMenuRef}>
          <button
            onClick={() => {
              setShowEdgeFlowMenu((current: boolean) => !current);
              setShowLayoutMenu(false);
            }}
            className={`flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors ${
              showEdgeFlowMenu
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                : settings.edgeAnimationsEnabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`}
            title="Fluxo das linhas"
          >
            <Zap size={14} />
            <span>Fluxo</span>
          </button>
          {showEdgeFlowMenu && (
            <div className="mf-theme-menu absolute left-0 top-10 z-[100] w-[260px] rounded-2xl border p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Fluxo das linhas</div>
                  <div className="text-[10px] text-slate-400">Controle global das animações</div>
                </div>
                <button
                  onClick={handleToggleEdgeAnimations}
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                    settings.edgeAnimationsEnabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {settings.edgeAnimationsEnabled ? <Pause size={10} /> : <Play size={10} />}
                  {settings.edgeAnimationsEnabled ? 'Ligado' : 'Parado'}
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {EDGE_ANIMATION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleApplyEdgeAnimationStyle(option.id)}
                    className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                      settings.edgeAnimationStyle === option.id
                        ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="text-xs font-semibold">{option.label}</div>
                    <div className="text-[10px] text-slate-400">{option.desc}</div>
                  </button>
                ))}
              </div>

              <div className="my-3 h-px bg-slate-200 dark:bg-slate-700" />
              <button
                onClick={() => setShowGlobalFlowColors((current) => !current)}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-2 text-slate-400">
                  <Palette size={13} />
                  <SlidersHorizontal size={13} />
                </div>
                {showGlobalFlowColors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showGlobalFlowColors && (
                <div className="mt-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Canvas inteiro</span>
                    <button
                      onClick={() => handleApplyGlobalEdgeColor(undefined)}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        globalEdgeColor === undefined
                          ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      Automático
                    </button>
                  </div>
                  <div className="mb-3">
                    <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">Cor</div>
                    <div className="flex flex-wrap gap-2">
                      {SHARED_COLOR_PALETTE.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleApplyGlobalEdgeColor(color)}
                          className={`h-5 w-5 rounded-full border-2 shadow-sm transition-transform hover:scale-110 ${
                            globalEdgeColor === color
                              ? 'scale-110 border-white ring-2 ring-amber-400 dark:border-slate-950 dark:ring-amber-500'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Aplicar ${color} em todas as linhas`}
                          aria-label={`Aplicar ${color} em todas as linhas`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">Tipo de linha</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'solid', label: 'Sólida' },
                        { value: 'dashed', label: 'Tracejada' },
                        { value: 'glow', label: 'Glow' },
                      ].map((variant) => (
                        <button
                          key={variant.value}
                          onClick={() => handleApplyGlobalEdgeVariant(variant.value as 'solid' | 'dashed' | 'glow')}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                            globalEdgeVariant === variant.value
                              ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          {variant.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">Espessura</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: '1', label: 'Fina' },
                        { value: '2', label: 'Média' },
                        { value: '4', label: 'Grossa' },
                      ].map((thickness) => (
                        <button
                          key={thickness.value}
                          onClick={() => handleApplyGlobalEdgeThickness(thickness.value)}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                            globalEdgeThickness === thickness.value
                              ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          {thickness.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowMinimap(!showMinimap)}
          disabled={cleanMode}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${showMinimap ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
          title="Alternar Minimapa"
        >
          <Map size={14} />
        </button>

        <button
          onClick={() => setShowStylePanel(!showStylePanel)}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${showStylePanel ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
          title="Alternar Painel de Propriedades"
        >
          <PanelRight size={14} />
        </button>

        <button
          onClick={() => setSelectionModeEnabled(!selectionModeEnabled)}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${selectionModeEnabled ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
          title="Seleção por área (Cmd/Ctrl+Shift+A)"
        >
          <MousePointer2 size={14} />
        </button>
        <button
          onClick={() => setFocusModeEnabled(!focusModeEnabled)}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${focusModeEnabled ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
          title="Modo foco por ramo"
        >
          <Focus size={14} />
        </button>
        <button
          onClick={() => setStructurePanelOpen(!structurePanelOpen)}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${structurePanelOpen ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
          title="Painel de estrutura"
        >
          <GitBranch size={14} />
        </button>
        <button
          onClick={() => setCleanMode(!cleanMode)}
          className={`flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors ${cleanMode ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
          title="Modo clean"
        >
          <PanelsLeftRight size={14} />
          <span>{cleanMode ? 'Clean on' : 'Clean'}</span>
        </button>

        <button
          onClick={() => setShowCommandPalette(true)}
          className="flex h-7 items-center gap-1.5 rounded px-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Command Palette / Buscar nós (Cmd/Ctrl+K)"
        >
          <Search size={14} />
          <Command size={14} />
          <span className="text-xs font-medium">Buscar</span>
        </button>
        <button
          onClick={() => setShowHistoryPanel(!showHistoryPanel)}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${showHistoryPanel ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
          title="Histórico de versões"
        >
          <History size={14} />
        </button>

        {selectedNodes.length > 1 && (
          <>
            <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <button
              onClick={() => handleAlignSelection('x')}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              title="Alinhar à esquerda"
            >
              <AlignStartVertical size={14} />
            </button>
            <button
              onClick={() => handleAlignSelection('y')}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              title="Alinhar no topo"
            >
              <AlignStartHorizontal size={14} />
            </button>
            <button
              onClick={handleDistributeSelection}
              disabled={selectedNodes.length < 3}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              title="Distribuir verticalmente"
            >
              <BetweenHorizontalStart size={14} />
            </button>
          </>
        )}

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <button
          onClick={() => setShowShortcutsModal(true)}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Atalhos do Teclado (?)"
        >
          <HelpCircle size={14} />
        </button>

        <button
          onClick={handleExportPDF}
          className="ml-2 flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Download size={14} />
          <span>Exportar PDF</span>
        </button>
        <button
          onClick={handleExportMarkdown}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          title="Exportar como Markdown"
        >
          <FileText size={14} />
          <span>Exportar MD</span>
        </button>
      </div>
    </div>
  );
};
