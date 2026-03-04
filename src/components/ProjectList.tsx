import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Plus, Folder, Clock, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface RecentMap {
  id: string;
  name: string;
  lastEdited: number;
  nodeCount: number;
}

export const ProjectList = () => {
  const [recentMaps, setRecentMaps] = useState<RecentMap[]>([]);
  const { setCurrentView, loadMap, setMapName } = useFlowStore();

  useEffect(() => {
    const maps = JSON.parse(localStorage.getItem('mindflow_recent_maps') || '[]');
    setRecentMaps(maps.sort((a: RecentMap, b: RecentMap) => b.lastEdited - a.lastEdited));
  }, []);

  const handleCreateNew = () => {
    const newId = uuidv4();
    const newMap = {
      id: newId,
      name: 'Novo Mapa Mental',
      nodes: [
        {
          id: 'root',
          type: 'idea',
          position: { x: 250, y: 250 },
          data: { label: 'Nova Ideia', color: '#8B5CF6' },
        }
      ],
      edges: [],
      lastEdited: Date.now(),
    };
    loadMap(newMap as any);
    setCurrentView('editor');
  };

  const handleOpenMap = (id: string) => {
    const mapDataStr = localStorage.getItem(`mindflow_${id}`);
    if (mapDataStr) {
      const mapData = JSON.parse(mapDataStr);
      loadMap(mapData);
      setCurrentView('editor');
    }
  };

  const handleDeleteMap = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    localStorage.removeItem(`mindflow_${id}`);
    const updatedMaps = recentMaps.filter(m => m.id !== id);
    localStorage.setItem('mindflow_recent_maps', JSON.stringify(updatedMaps));
    setRecentMaps(updatedMaps);
  };

  return (
    <div className="flex h-full w-full flex-col items-center bg-slate-50 p-8 dark:bg-slate-950">
      <div className="w-full max-w-5xl">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Meus Projetos</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Gerencie seus mapas mentais e ideias.</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus size={18} />
            Novo Mapa
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recentMaps.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-24 dark:border-slate-800">
              <Folder size={48} className="mb-4 text-slate-300 dark:text-slate-700" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Nenhum projeto ainda</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crie seu primeiro mapa mental para começar.</p>
              <button
                onClick={handleCreateNew}
                className="mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Criar novo projeto &rarr;
              </button>
            </div>
          ) : (
            recentMaps.map((map) => (
              <div
                key={map.id}
                onClick={() => handleOpenMap(map.id)}
                className="group relative flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Folder size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{map.name}</h3>
                
                <div className="mt-auto pt-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>{new Date(map.lastEdited).toLocaleDateString()}</span>
                  </div>
                  <span>{map.nodeCount} nós</span>
                </div>

                <button
                  onClick={(e) => handleDeleteMap(e, map.id)}
                  className="absolute right-4 top-4 hidden rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 group-hover:block dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
