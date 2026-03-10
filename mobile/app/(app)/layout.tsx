import { BottomNav } from '@/components/navigation/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh bg-dark-bg">
      {/* Conteúdo com padding para não ficar atrás do bottom nav */}
      <main className="flex-1 content-area">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
