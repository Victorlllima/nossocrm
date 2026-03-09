/**
 * In-memory locking para evitar processamento paralelo de mensagens do mesmo número.
 */

const processingSet = new Set<string>();

export function isProcessing(phone: string): boolean {
    return processingSet.has(phone);
}

export function markAsProcessing(phone: string): void {
    processingSet.add(phone);
}

export function markAsDone(phone: string): void {
    processingSet.delete(phone);
}
