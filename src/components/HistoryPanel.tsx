import { History, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useFlowStore } from '../store/useFlowStore';

export const HistoryPanel = () => {
  const { history, historyIndex, showHistoryPanel, setShowHistoryPanel, jumpToHistoryIndex } = useFlowStore();

  return (
    <AnimatePresence>
      {showHistoryPanel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-[55] flex justify-end bg-slate-950/25"
        >
          <motion.div
            initial={{ x: 28, opacity: 0.96 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="h-full w-full max-w-sm border-l border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700/70 dark:bg-slate-900/82 backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={16} className="text-violet-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Histórico</h2>
              </div>
              <button
                onClick={() => setShowHistoryPanel(false)}
                className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
              {history.length} versão{history.length === 1 ? '' : 'ões'} disponíveis
            </div>

            <div className="space-y-1 overflow-y-auto pr-1">
              {history
                .map((entry, index) => ({ entry, index }))
                .reverse()
                .map(({ entry, index }) => {
                  const isCurrent = index === historyIndex;
                  return (
                    <button
                      key={`${index}-${entry.nodes.length}-${entry.edges.length}`}
                      onClick={() => jumpToHistoryIndex(index)}
                      className={`w-full rounded-md border px-2.5 py-2 text-left transition-colors ${
                        isCurrent
                          ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className="text-xs font-medium">Versão #{index + 1}</div>
                      <div className="mt-0.5 text-[11px] opacity-80">
                        {entry.nodes.length} nós • {entry.edges.length} conexões
                      </div>
                    </button>
                  );
                })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
