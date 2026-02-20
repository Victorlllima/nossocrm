/**
 * FunÃ§Ã£o pÃºblica `getErrorMessage` do projeto.
 *
 * @param {unknown} error - ParÃ¢metro `error`.
 * @returns {string} Retorna um valor do tipo `string`.
 */
export const getErrorMessage = (error: unknown): string => {
    if (!error) return 'Ocorreu um erro desconhecido.';

    let message = 'Erro desconhecido.';
    if (typeof error === 'string') {
        message = error;
    } else if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === 'object' && 'message' in error) {
        message = String((error as { message: unknown }).message);
    }

    // Mapas de traduÃ§Ã£o
    const translations: Record<string, string> = {
        'Invalid login credentials': 'Email ou senha incorretos.',
        'Email not confirmed': 'Por favor, confirme seu email antes de entrar.',
        'User not found': 'UsuÃ¡rio nÃ£o encontrado.',
        'Password is known to be weak and easy to guess, please choose a different one.': 'A senha Ã© muito fraca. Por favor, escolha uma senha mais forte (use letras maiÃºsculas, minÃºsculas e nÃºmeros).',
        'New password should be different from the old password.': 'A nova senha deve ser diferente da senha anterior.',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
        'Token has expired or is invalid': 'O link expirou ou Ã© invÃ¡lido.',
        'Auth session missing!': 'SessÃ£o expirada. Por favor, faÃ§a login novamente.',
        'User already registered': 'Este email jÃ¡ estÃ¡ cadastrado.',
        'Rate limit exceeded': 'Muitas tentativas. Por favor, aguarde um momento.',
    };

    // VerificaÃ§Ã£o exata
    if (translations[message]) {
        return translations[message];
    }

    // VerificaÃ§Ãµes parciais (para mensagens dinÃ¢micas ou variaÃ§Ãµes)
    if (message.includes('weak password')) return 'Sua senha Ã© muito fraca.';
    if (message.includes('already registered')) return 'Este email jÃ¡ estÃ¡ em uso.';
    if (message.includes('invalid login')) return 'Credenciais invÃ¡lidas.';
    if (message.includes('unexpected error')) return 'Ocorreu um erro inesperado. Tente novamente.';

    // Retorno original se nÃ£o houver traduÃ§Ã£o (fallback)
    return message;
};
