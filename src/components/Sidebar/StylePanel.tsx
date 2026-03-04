import { useFlowStore } from '../../store/useFlowStore';
import { useReactFlow } from '@xyflow/react';
import { Settings2, Trash2, Copy } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { MindFlowNode } from '../../types';

export const StylePanel = () => {
  const { nodes, updateNodeData, deleteElements, addNode } = useFlowStore();
  const { getNodes } = useReactFlow();
  
  const selectedNodes = getNodes().filter((n) => n.selected) as MindFlowNode[];
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

  if (!selectedNode) {
    return (
      <div className="w-64 flex-shrink-0 border-l border-slate-200 bg-slate-50/50 p-4 flex flex-col items-center justify-center text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 transition-colors duration-300">
        <Settings2 size={24} className="mb-3 opacity-20" />
        <p className="text-xs">Select a node to edit</p>
      </div>
    );
  }

  const handleDuplicate = () => {
    const newNode = {
      ...selectedNode,
      id: uuidv4(),
      position: {
        x: selectedNode.position.x + 50,
        y: selectedNode.position.y + 50,
      },
      selected: false,
    };
    addNode(newNode);
  };

  const handleDelete = () => {
    deleteElements([selectedNode], []);
  };

  return (
    <div className="w-64 flex-shrink-0 border-l border-slate-200 bg-white p-4 flex flex-col gap-6 overflow-y-auto dark:border-slate-800 dark:bg-slate-950 transition-colors duration-300">
      <div>
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Properties</h2>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Label</label>
            <input
              type="text"
              value={selectedNode.data.label as string || ''}
              onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
              className="rounded-md border border-slate-200 bg-transparent px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-800 dark:text-slate-100 dark:focus:border-slate-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Description</label>
            <textarea
              value={selectedNode.data.description as string || ''}
              onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
              className="min-h-[60px] rounded-md border border-slate-200 bg-transparent px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 resize-y dark:border-slate-800 dark:text-slate-100 dark:focus:border-slate-600"
              placeholder="Add a description..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Color</label>
            <div className="flex flex-wrap gap-2">
              {['#64748b', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'].map((color) => (
                <button
                  key={color}
                  onClick={() => updateNodeData(selectedNode.id, { color })}
                  className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    selectedNode.data.color === color ? 'border-slate-900 dark:border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {selectedNode.type === 'funnel' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Metrics</label>
              <input
                type="text"
                value={selectedNode.data.metrics as string || ''}
                onChange={(e) => updateNodeData(selectedNode.id, { metrics: e.target.value })}
                className="rounded-md border border-slate-200 bg-transparent px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-800 dark:text-slate-100 dark:focus:border-slate-600"
                placeholder="e.g., 50% Conversion"
              />
            </div>
          )}

          {selectedNode.type === 'image' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Image URL</label>
              <input
                type="text"
                value={selectedNode.data.imageUrl as string || ''}
                onChange={(e) => updateNodeData(selectedNode.id, { imageUrl: e.target.value })}
                className="rounded-md border border-slate-200 bg-transparent px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-800 dark:text-slate-100 dark:focus:border-slate-600"
                placeholder="https://..."
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleDuplicate}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          <Copy size={14} />
          Duplicate
        </button>
        <button
          onClick={handleDelete}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
};
