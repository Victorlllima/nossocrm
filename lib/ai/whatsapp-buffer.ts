/**
 * Message Buffer Management
 * Migrated from N8n Redis buffer logic
 * 
 * Prevents message flooding and implements anti-spam
 */

import { createStaticAdminClient } from '@/lib/supabase/server';

const BUFFER_WAIT_MS = 15000; // 15 seconds (from N8n: EsperaBuffer)
const INACTIVITY_TIMEOUT_MS = 3600000; // 1 hour (from N8n: TempoInatividadeAgente)

interface BufferEntry {
    phone: string;
    messages: string[];
    lastMessageAt: number;
    isProcessing: boolean;
}

// In-memory buffer (can be replaced with Redis/Vercel KV for production)
const messageBuffer = new Map<string, BufferEntry>();

/**
 * Adds a message to the buffer
 * 
 * @param phone - Lead's phone number
 * @param message - Message content
 * @returns true if message should be processed immediately, false if buffered
 */
export function bufferMessage(phone: string, message: string): boolean {
    const now = Date.now();
    const existing = messageBuffer.get(phone);

    if (!existing) {
        // First message from this phone
        messageBuffer.set(phone, {
            phone,
            messages: [message],
            lastMessageAt: now,
            isProcessing: false,
        });
        return true; // Process immediately
    }

    // Check if previous message is still being processed
    if (existing.isProcessing) {
        existing.messages.push(message);
        existing.lastMessageAt = now;
        return false; // Buffer it
    }

    // Check if enough time has passed since last message
    const timeSinceLastMessage = now - existing.lastMessageAt;
    if (timeSinceLastMessage < BUFFER_WAIT_MS) {
        existing.messages.push(message);
        existing.lastMessageAt = now;
        return false; // Buffer it
    }

    // Enough time has passed, process it
    existing.messages = [message];
    existing.lastMessageAt = now;
    return true;
}

/**
 * Marks a phone as processing
 * 
 * @param phone - Lead's phone number
 */
export function markAsProcessing(phone: string): void {
    const entry = messageBuffer.get(phone);
    if (entry) {
        entry.isProcessing = true;
    }
}

/**
 * Marks a phone as done processing
 * 
 * @param phone - Lead's phone number
 */
export function markAsDone(phone: string): void {
    const entry = messageBuffer.get(phone);
    if (entry) {
        entry.isProcessing = false;
    }
}

/**
 * Gets buffered messages for a phone
 * 
 * @param phone - Lead's phone number
 * @returns Array of buffered messages
 */
export function getBufferedMessages(phone: string): string[] {
    const entry = messageBuffer.get(phone);
    if (!entry) return [];

    const messages = [...entry.messages];
    entry.messages = [];
    return messages;
}

/**
 * Checks if agent should be active for this conversation
 * Based on N8n's inactivity timeout logic
 * 
 * @param phone - Lead's phone number
 * @returns true if agent should respond, false if inactive
 */
export function isAgentActive(phone: string): boolean {
    const entry = messageBuffer.get(phone);
    if (!entry) return true; // First message, agent is active

    const timeSinceLastMessage = Date.now() - entry.lastMessageAt;
    return timeSinceLastMessage < INACTIVITY_TIMEOUT_MS;
}

/**
 * Cleanup old buffer entries (run periodically)
 */
export function cleanupBuffer(): void {
    const now = Date.now();
    for (const [phone, entry] of messageBuffer.entries()) {
        const timeSinceLastMessage = now - entry.lastMessageAt;
        if (timeSinceLastMessage > INACTIVITY_TIMEOUT_MS * 2) {
            messageBuffer.delete(phone);
        }
    }
}

// Run cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupBuffer, 600000);
}
