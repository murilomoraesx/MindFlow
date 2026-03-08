import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';
import { useFlowStore } from '../store/useFlowStore';
import { clearMindflowAuth } from '../utils/auth';

type AccountMenuProps = {
  onLoggedOut?: () => void | Promise<void>;
};

export const AccountMenu = ({ onLoggedOut }: AccountMenuProps) => {
  const { currentUser, setCurrentView, setCurrentUser } = useFlowStore();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  const initials = useMemo(() => {
    const name = currentUser?.name?.trim();
    if (!name) return 'MF';
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
  }, [currentUser?.name]);

  if (!currentUser) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/72 px-2.5 pr-3 text-left shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-800/80 dark:bg-slate-900/62 dark:hover:bg-slate-800"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/14 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{currentUser.name}</div>
          <div className="truncate text-[11px] uppercase tracking-[0.12em] text-slate-400">{currentUser.role}</div>
        </div>
        <ChevronDown size={14} className={open ? 'rotate-180 text-slate-500 transition-transform' : 'text-slate-500 transition-transform'} />
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-[120] w-[260px] rounded-[24px] border border-slate-200/80 bg-white/92 p-3 shadow-[0_22px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/92">
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/14 text-sm font-semibold text-violet-700 dark:text-violet-300">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{currentUser.name}</div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {currentUser.role === 'master' && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('admin');
                  setOpen(false);
                }}
                className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ShieldCheck size={16} />
                Painel administrativo
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setCurrentView('projects');
                setOpen(false);
              }}
              className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LayoutDashboard size={16} />
              Meus projetos
            </button>
            <button
              type="button"
              onClick={async () => {
                await clearMindflowAuth();
                setCurrentUser(null);
                setOpen(false);
                await onLoggedOut?.();
              }}
              className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
