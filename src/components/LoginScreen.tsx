import { type FormEvent, useState } from 'react';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { authenticateMindflow, isMindflowAuthConfigured } from '../utils/auth';

type LoginScreenProps = {
  onSuccess: () => void;
};

export const LoginScreen = ({ onSuccess }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const authConfigured = isMindflowAuthConfigured();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!authConfigured) {
      setError('Login não configurado neste ambiente.');
      return;
    }

    const authenticated = authenticateMindflow(email, password);
    if (!authenticated) {
      setError('E-mail ou senha inválidos.');
      return;
    }

    setError('');
    onSuccess();
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-slate-50 px-6 py-10 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.10),_transparent_26%)] dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_26%)]" />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white/92 p-7 shadow-[0_28px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/92"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-violet-500">MindFlow</div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Entrar no workspace</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Acesso protegido para abrir projetos, mapas e histórico com segurança.
            </p>
          </div>
          <div className="rounded-2xl border border-violet-200/80 bg-violet-500/10 p-3 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">E-mail</span>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/70">
              <Mail size={16} className="text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                placeholder="seuemail@empresa.com"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Senha</span>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/70">
              <LockKeyhole size={16} className="text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                placeholder="Digite sua senha"
              />
            </div>
          </label>
        </div>

        {!authConfigured && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            Configure `VITE_AUTH_EMAIL` e `VITE_AUTH_PASSWORD` no ambiente local. Para produção, o ideal é mover isso para um backend.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:scale-[1.01] hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          Entrar
        </button>
      </form>
    </div>
  );
};
