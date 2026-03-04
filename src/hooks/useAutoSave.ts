import { useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';

export const useAutoSave = () => {
  const { nodes, edges, mapName, mapId } = useFlowStore();

  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (nodes.length === 0) return;
      
      const mapData = {
        id: mapId,
        name: mapName,
        nodes,
        edges,
        lastEdited: Date.now(),
      };
      
      localStorage.setItem(`mindflow_${mapId}`, JSON.stringify(mapData));
      
      // Update recent maps list
      const recentMaps = JSON.parse(localStorage.getItem('mindflow_recent_maps') || '[]');
      const existingIndex = recentMaps.findIndex((m: any) => m.id === mapId);
      
      if (existingIndex >= 0) {
        recentMaps[existingIndex] = { id: mapId, name: mapName, lastEdited: Date.now(), nodeCount: nodes.length };
      } else {
        recentMaps.push({ id: mapId, name: mapName, lastEdited: Date.now(), nodeCount: nodes.length });
      }
      
      localStorage.setItem('mindflow_recent_maps', JSON.stringify(recentMaps));
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(saveTimer);
  }, [nodes, edges, mapName, mapId]);
};
