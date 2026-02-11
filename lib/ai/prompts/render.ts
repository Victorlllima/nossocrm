function getByPath(obj: any, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Renderiza templates no formato `{{var}}` (com suporte a path `a.b.c`).
 * - Se a variÃ¡vel nÃ£o existir, substitui por string vazia.
 * - NÃ£o executa lÃ³gica; Ã© intencionalmente simples/seguro.
 */
export function renderPromptTemplate(template: string, vars: Record<string, unknown>): string {
  return String(template || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    const v = getByPath(vars, String(key));
    if (v == null) return '';
    return typeof v === 'string' ? v : String(v);
  });
}

