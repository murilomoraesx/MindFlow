import { useFlowStore } from '../../store/useFlowStore';
import { Undo2, Redo2, Download, Moon, Sun, Menu, Save, ChevronLeft, Map, PanelRight } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export const TopBar = () => {
  const { mapName, setMapName, undo, redo, theme, setTheme, setCurrentView, showMinimap, setShowMinimap, showStylePanel, setShowStylePanel } = useFlowStore();
  const { getNodes } = useReactFlow();

  const handleExportPDF = async () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement;
    if (!flowElement) return;

    try {
      const dataUrl = await toPng(flowElement, {
        backgroundColor: theme === 'dark' ? '#020617' : '#f8fafc',
        pixelRatio: 2,
      });

      const pdf = new jsPDF({
        orientation: flowElement.offsetWidth > flowElement.offsetHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [flowElement.offsetWidth, flowElement.offsetHeight]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, flowElement.offsetWidth, flowElement.offsetHeight);
      pdf.save(`${mapName || 'mindmap'}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  return (
    <div className="flex h-12 w-full items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentView('projects')}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Back to Projects"
        >
          <ChevronLeft size={16} />
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
          placeholder="Untitled"
        />
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
          <Save size={10} className="text-slate-400" />
          <span>Saved</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={redo}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>
        
        <div className="mx-2 h-4 w-px bg-slate-200 dark:bg-slate-800" />
        
        <button
          onClick={() => setShowMinimap(!showMinimap)}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${showMinimap ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
          title="Toggle Minimap"
        >
          <Map size={14} />
        </button>

        <button
          onClick={() => setShowStylePanel(!showStylePanel)}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${showStylePanel ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
          title="Toggle Properties Panel"
        >
          <PanelRight size={14} />
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <button 
          onClick={handleExportPDF}
          className="ml-2 flex items-center gap-2 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Download size={14} />
          <span>Export PDF</span>
        </button>
      </div>
    </div>
  );
};
