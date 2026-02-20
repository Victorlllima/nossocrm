import { notFound, redirect } from 'next/navigation';
import DealCockpitMockClient from './DealCockpitMockClient';
import DealCockpitClient from '@/features/deals/cockpit/DealCockpitClient';

/**
 * Cockpit mock (high-density, everything in one place)
 * Access at: /labs/deal-cockpit-mock
 */
export default function DealCockpitMockPage({
  searchParams,
}: {
  searchParams?: { dealId?: string; mode?: string };
}) {
  // Dev-only. Em dev, habilitado por padrÃ£o.
  const envFlag = process.env.ALLOW_UI_MOCKS_ROUTE;
  const isEnabled =
    process.env.NODE_ENV === 'development' &&
    (envFlag == null || String(envFlag).toLowerCase() === 'true');

  if (!isEnabled) {
    notFound();
  }

  const mode = (searchParams?.mode ?? '').toLowerCase();

  // Default: versÃ£o "real" (plugada no CRMContext + Supabase hooks + chat real).
  // Fallback: ?mode=mock mantÃ©m o UI mock original.
  if (mode === 'mock') {
    return <DealCockpitMockClient />;
  }

  // Se jÃ¡ temos um dealId, leva para a rota V2 (experimento).
  // Mantemos /labs como ponte/entrada para o cockpit V2 durante o rollout.
  if (searchParams?.dealId) {
    redirect(`/deals/${searchParams.dealId}/cockpit-v2`);
  }

  return <DealCockpitClient dealId={searchParams?.dealId} />;
}
