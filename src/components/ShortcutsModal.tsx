import { useFlowStore } from '../store/useFlowStore';
import { X, Keyboard } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const shortcuts = [
  { keys: 'Tab', description: 'Criar tópico filho' },
  { keys: 'Enter', description: 'Criar tópico irmão' },
  { keys: 'Cmd/Ctrl+Z', description: 'Desfazer' },
  { keys: 'Cmd/Ctrl+Shift+Z', description: 'Refazer' },
  { keys: 'Cmd/Ctrl+D', description: 'Duplicar nó selecionado' },
  { keys: 'Cmd/Ctrl+Shift+D', description: 'Desconectar nós selecionados' },
  { keys: 'Delete', description: 'Excluir selecionados' },
  { keys: 'F2', description: 'Renomear nó selecionado' },
  { keys: 'Cmd/Ctrl+S', description: 'Forçar salvamento' },
  { keys: 'Cmd/Ctrl+K', description: 'Abrir Command Palette' },
  { keys: 'Cmd/Ctrl+F', description: 'Buscar nós (Command Palette)' },
  { keys: 'Cmd/Ctrl+H', description: 'Abrir histórico de versões' },
  { keys: 'Cmd/Ctrl+E', description: 'Alternar painel de propriedades' },
  { keys: 'Cmd/Ctrl+M', description: 'Alternar minimapa' },
  { keys: 'Cmd/Ctrl+L', description: 'Organizar automaticamente' },
  { keys: 'Cmd/Ctrl+Shift+L', description: 'Organizar subárvore selecionada' },
  { keys: 'Cmd/Ctrl+Shift+A', description: 'Ativar/desativar seleção por área' },
  { keys: 'Quick Bar', description: 'Ações rápidas ao selecionar um nó' },
  { keys: 'Cmd/Ctrl+Shift+P', description: 'Entrar/sair do modo apresentação' },
  { keys: 'Setas <- ->', description: 'Navegar no roteiro da apresentação' },
  { keys: 'Cmd/Ctrl++', description: 'Zoom in' },
  { keys: 'Cmd/Ctrl+-', description: 'Zoom out' },
  { keys: 'Cmd/Ctrl+0', description: 'Ajustar à tela' },
  { keys: 'Cmd/Ctrl+1', description: 'Focar nos nós selecionados' },
  { keys: 'Esc', description: 'Sair do modo apresentação' },
  { keys: '?', description: 'Mostrar/ocultar atalhos' },
];

export const ShortcutsModal = () => {
  const { showShortcutsModal, setShowShortcutsModal } = useFlowStore();

  return (
    <AnimatePresence>
      {showShortcutsModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowShortcutsModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative flex max-h-[min(84vh,46rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <div className="mb-4 flex items-center gap-2">
              <Keyboard size={20} className="text-violet-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Atalhos do Teclado</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="flex flex-col gap-1">
              {shortcuts.map((s) => (
                <div key={s.keys} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{s.description}</span>
                  <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {s.keys}
                  </kbd>
                </div>
              ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
