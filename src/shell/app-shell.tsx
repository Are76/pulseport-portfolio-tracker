import type { PropsWithChildren } from 'react';
import { AppHeader } from './app-header';
import { AppNav } from './app-nav';
import type { ShellView } from './shell-types';
import './shell-layout.css';

type AppShellProps = PropsWithChildren<{
  title: string;
  activeView: ShellView;
  onNavigate: (view: ShellView) => void;
}>;

export function AppShell({ children, title, activeView, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <AppNav activeView={activeView} onNavigate={onNavigate} />
      </aside>
      <main className="app-shell__content">
        <AppHeader title={title} />
        <section className="app-shell__page">
          <div className="app-shell__page-body">{children}</div>
        </section>
      </main>
    </div>
  );
}
