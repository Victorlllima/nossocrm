import { createClient } from '@supabase/supabase-js';

type BootstrapInput = {
  supabaseUrl: string;
  serviceRoleKey: string;
  companyName: string;
  email: string;
  password: string;
};

type BootstrapResult =
  | { ok: false; error: string }
  | { ok: true; organizationId: string; userId: string; mode: 'created' | 'updated' };

async function findUserIdByEmail(
  admin: any,
  email: string
): Promise<string | null> {
  // Supabase Auth Admin API nÃ£o tem "getUserByEmail" no client;
  // para o nosso caso (1 usuÃ¡rio no bootstrap) listar Ã© OK.
  const target = email.trim().toLowerCase();

  let page = 1;
  const perPage = 200;

  for (let i = 0; i < 10; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return null;

    const users = data?.users || [];
    const found = users.find((u) => (u.email || '').toLowerCase() === target);
    if (found?.id) return found.id;

    if (users.length < perPage) return null;
    page += 1;
  }

  return null;
}

/**
 * FunÃ§Ã£o pÃºblica `bootstrapInstance` do projeto.
 *
 * Contrato padronizado do installer:
 * - Ã‰ **idempotente**: pode rodar mais de uma vez.
 * - Garante que o admin informado consegue logar: cria o usuÃ¡rio ou **atualiza a senha** se jÃ¡ existir.
 */
export async function bootstrapInstance({
  supabaseUrl,
  serviceRoleKey,
  companyName,
  email,
  password,
}: BootstrapInput): Promise<BootstrapResult> {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const emailNorm = email.trim().toLowerCase();

  // 1) Organization (reusa se jÃ¡ existir)
  const { data: existingOrgs, error: orgCheckError } = await admin
    .from('organizations')
    .select('id')
    .limit(1);

  if (orgCheckError) return { ok: false, error: orgCheckError.message };

  let organizationId: string | null = existingOrgs?.[0]?.id || null;
  let createdOrg = false;

  if (!organizationId) {
    const { data: organization, error: orgError } = await admin
      .from('organizations')
      .insert({ name: companyName })
      .select('id')
      .single();

    if (orgError || !organization?.id) {
      return { ok: false, error: orgError?.message || 'Failed to create organization' };
    }

    organizationId = organization.id;
    createdOrg = true;
  }

  // 2) Auth user (cria ou atualiza)
  let userId: string | null = await findUserIdByEmail(admin, emailNorm);
  let mode: 'created' | 'updated' = 'updated';

  if (!userId) {
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        organization_id: organizationId,
      },
    });

    if (userError || !userData?.user?.id) {
      if (createdOrg && organizationId) {
        await admin.from('organizations').delete().eq('id', organizationId);
      }
      return { ok: false, error: userError?.message || 'Failed to create admin user' };
    }

    userId = userData.user.id;
    mode = 'created';
  } else {
    // Sempre garante que a senha digitada Ã© a senha vÃ¡lida para login.
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        organization_id: organizationId,
      },
    });

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    mode = 'updated';
  }

  // 3) Profile upsert
  const displayName = emailNorm.split('@')[0] || 'Admin';

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      email: emailNorm,
      name: displayName,
      first_name: displayName,
      organization_id: organizationId,
      role: 'admin',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    // Se foi uma criaÃ§Ã£o de org nessa execuÃ§Ã£o, tenta rollback.
    if (createdOrg && organizationId) {
      await admin.from('organizations').delete().eq('id', organizationId);
    }
    return { ok: false, error: profileError.message };
  }

  return {
    ok: true,
    organizationId: organizationId!,
    userId,
    mode,
  };
}
