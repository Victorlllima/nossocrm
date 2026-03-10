'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, KanbanSquare, Users, CheckSquare, CalendarClock } from 'lucide-react';

const NAV = [
  { href: '/inbox',      icon: Inbox,          label: 'Inbox' },
  { href: '/boards',     icon: KanbanSquare,   label: 'Boards' },
  { href: '/contacts',   icon: Users,          label: 'Contatos' },
  { href: '/activities', icon: CheckSquare,    label: 'Tarefas' },
  { href: '/follow-up',  icon: CalendarClock,  label: 'Follow-up' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-dark-border bg-dark-card/90 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14 items-stretch">
        {NAV.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-primary-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? 'text-primary-400' : ''}`}
                aria-hidden="true"
              />
              <span className="font-display tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
