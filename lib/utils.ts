import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * FunÃ§Ã£o pÃºblica `cn` do projeto.
 *
 * @param {ClassValue[]} inputs - ParÃ¢metro `inputs`.
 * @returns {string} Retorna um valor do tipo `string`.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
