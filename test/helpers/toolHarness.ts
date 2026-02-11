type ExecutableTool = {
  execute: (input: unknown) => unknown | Promise<unknown>;
};

// In tests, we invoke tools directly to validate behavior without UI.
/**
 * FunÃ§Ã£o pÃºblica `callTool` do projeto.
 *
 * @param {Record<string, ExecutableTool>} tools - ParÃ¢metro `tools`.
 * @param {string} name - ParÃ¢metro `name`.
 * @param {unknown} input - ParÃ¢metro `input`.
 * @returns {Promise<unknown>} Retorna um valor do tipo `Promise<unknown>`.
 */
export async function callTool(
  tools: Record<string, ExecutableTool>,
  name: string,
  input: unknown,
): Promise<unknown> {
  const tool = tools[name];
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return await tool.execute(input);
}
