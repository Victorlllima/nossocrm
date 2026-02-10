/**
 * Message Formatting and Sending
 * Handles message splitting and Evolution API integration
 * Migrated from N8n: Split Out + Loop + Evolution API nodes
 */

const MAX_MESSAGE_LENGTH = 1000; // WhatsApp recommended max length
const MESSAGE_DELAY_MS = 1000; // 1 second delay between messages

/**
 * Splits long messages into smaller chunks
 * Preserves sentence boundaries when possible
 * 
 * @param text - Full message text
 * @returns Array of message chunks
 */
export function splitMessage(text: string): string[] {
    if (text.length <= MAX_MESSAGE_LENGTH) {
        return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';

    // Split by sentences (., !, ?)
    const sentences = text.split(/([.!?]\s+)/);

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];

        if ((currentChunk + sentence).length <= MAX_MESSAGE_LENGTH) {
            currentChunk += sentence;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Sends a message via Evolution API
 * 
 * @param phone - Recipient's phone number (with country code)
 * @param text - Message text
 * @returns Success status
 */
export async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
    try {
        const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
        const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

        if (!EVOLUTION_URL || !EVOLUTION_KEY) {
            console.error('Evolution API credentials not configured');
            return false;
        }

        // Format phone for Evolution API (add @s.whatsapp.net if needed)
        const formattedPhone = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;

        const response = await fetch(EVOLUTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_KEY,
            },
            body: JSON.stringify({
                number: formattedPhone,
                text: text,
            }),
        });

        if (!response.ok) {
            console.error('Evolution API error:', await response.text());
            return false;
        }

        return true;

    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        return false;
    }
}

/**
 * Sends multiple messages with delay between them
 * 
 * @param phone - Recipient's phone number
 * @param messages - Array of message texts
 * @returns Number of successfully sent messages
 */
export async function sendMultipleMessages(phone: string, messages: string[]): Promise<number> {
    let successCount = 0;

    for (let i = 0; i < messages.length; i++) {
        const success = await sendWhatsAppMessage(phone, messages[i]);
        if (success) {
            successCount++;
        }

        // Add delay between messages (except for the last one)
        if (i < messages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY_MS));
        }
    }

    return successCount;
}

/**
 * Formats and sends AI response via WhatsApp
 * Handles long messages by splitting them
 * 
 * @param phone - Recipient's phone number
 * @param responseText - AI response text
 * @returns Success status
 */
export async function formatAndSendResponse(phone: string, responseText: string): Promise<boolean> {
    const chunks = splitMessage(responseText);
    const successCount = await sendMultipleMessages(phone, chunks);

    return successCount === chunks.length;
}
