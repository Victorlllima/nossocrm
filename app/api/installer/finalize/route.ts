import { z } from 'zod';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';
import { upsertProjectEnvs, waitForVercelDeploymentReady } from '@/lib/installer/vercel';

export const dynamic = 'force-dynamic';

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
    },
  });
}

const Schema = z
  .object({
    installerToken: z.string().optional(),
    vercel: z
      .object({
        token: z.string().min(1),
        projectId: z.string().min(1),
        teamId: z.string().optional(),
        targets: z.array(z.enum(['production', 'preview'])).min(1),
        deploymentId: z.string().min(1),
      })
      .strict(),
  })
  .strict();

/**
 * Finaliza a instalaÃ§Ã£o quando tudo jÃ¡ foi aplicado, mas o wizard ficou aguardando o redeploy na Vercel.
 *
 * - Espera o deployment ficar READY
 * - Desabilita o instalador (INSTALLER_ENABLED=false)
 */
export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);

  const expectedToken = process.env.INSTALLER_TOKEN;
  if (expectedToken && parsed.data.installerToken !== expectedToken) {
    return json({ error: 'Invalid installer token' }, 403);
  }

  const { token, projectId, teamId, targets, deploymentId } = parsed.data.vercel;

  const wait = await waitForVercelDeploymentReady({
    token,
    deploymentId,
    teamId,
    timeoutMs: 240_000,
    pollMs: 2_500,
  });

  if (!wait.ok) {
    return json(
      {
        error:
          'O redeploy ainda estÃ¡ finalizando na Vercel. Aguarde mais um pouco e tente novamente.',
        lastReadyState: wait.lastReadyState,
      },
      504
    );
  }

  // SÃ³ desabilita o instalador APÃ“S o deploy estar READY (evita travar o wizard por erro transient).
  await upsertProjectEnvs(
    token,
    projectId,
    [{ key: 'INSTALLER_ENABLED', value: 'false', targets }],
    teamId
  );

  return json({ ok: true, readyState: wait.deployment.readyState || 'READY' });
}


