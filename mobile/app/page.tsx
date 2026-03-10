import { redirect } from 'next/navigation';

// Redireciona raiz → inbox (ou login se não autenticado — middleware lida com isso)
export default function RootPage() {
  redirect('/inbox');
}
