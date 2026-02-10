/**
 * Multimodal Message Processing
 * Handles images, PDFs, and audio messages from WhatsApp
 * Migrated from N8n workflow multimodal nodes
 */

import { openai } from '@ai-sdk/openai';

/**
 * Processes image messages using OpenAI Vision API
 * 
 * @param imageUrl - URL of the image to process
 * @param userPrompt - Optional user prompt/question about the image
 * @returns Extracted text or description from the image
 */
export async function processImage(imageUrl: string, userPrompt?: string): Promise<string> {
    try {
        const OpenAI = (await import('openai')).default;
        const openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const prompt = userPrompt || 'Descreva esta imagem em detalhes, focando em texto visÃ­vel, caracterÃ­sticas de imÃ³veis, ou informaÃ§Ãµes relevantes para um corretor de imÃ³veis.';

        const response = await openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: imageUrl } },
                    ],
                },
            ],
            max_tokens: 500,
        });

        const description = response.choices[0]?.message?.content || '[NÃ£o foi possÃ­vel processar a imagem]';
        return description;

    } catch (error) {
        console.error('Error processing image:', error);
        return '[Erro ao processar imagem. Por favor, envie como texto ou tente novamente.]';
    }
}

/**
 * Processes PDF documents
 * 
 * @param pdfUrl - URL of the PDF to process
 * @returns Extracted text from the PDF
 */
export async function processPDF(pdfUrl: string): Promise<string> {
    try {
        const pdfParse = await import('pdf-parse');

        // Download PDF
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
            throw new Error('Failed to download PDF');
        }

        const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

        // Extract text
        const pdfData = await (pdfParse as any).default(pdfBuffer);
        const text = pdfData.text.trim();

        if (!text) {
            return '[PDF vazio ou sem texto extraÃ­vel. Por favor, envie as informaÃ§Ãµes como texto.]';
        }

        // Limit text length (max 2000 chars)
        return text.length > 2000 ? text.substring(0, 2000) + '...' : text;

    } catch (error) {
        console.error('Error processing PDF:', error);
        return '[Erro ao processar PDF. Por favor, envie as informaÃ§Ãµes como texto.]';
    }
}

/**
 * Processes audio messages using Whisper API
 * 
 * @param audioUrl - URL of the audio file
 * @returns Transcribed text from the audio
 */
export async function processAudio(audioUrl: string): Promise<string> {
    try {
        const OpenAI = (await import('openai')).default;
        const openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Download audio file
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
            throw new Error('Failed to download audio');
        }

        const audioBlob = await audioResponse.blob();
        const audioFile = new File([audioBlob], 'audio.ogg', { type: 'audio/ogg' });

        // Transcribe with Whisper
        const transcription = await openaiClient.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'pt',
        });

        return transcription.text || '[NÃ£o foi possÃ­vel transcrever o Ã¡udio]';

    } catch (error) {
        console.error('Error processing audio:', error);
        return '[Erro ao processar Ã¡udio. Por favor, envie sua mensagem como texto.]';
    }
}

/**
 * Detects and processes multimodal content from Evolution API webhook
 * 
 * @param messageData - Message data from Evolution API
 * @returns Processed text content
 */
export async function processMultimodalMessage(messageData: any): Promise<string | null> {
    const messageType = messageData?.messageType;

    switch (messageType) {
        case 'imageMessage':
            const imageUrl = messageData.message?.imageMessage?.url;
            const imageCaption = messageData.message?.imageMessage?.caption || '';
            if (imageUrl) {
                const imageText = await processImage(imageUrl, imageCaption);
                return imageCaption ? `${imageCaption}\n\n${imageText}` : imageText;
            }
            break;

        case 'documentMessage':
            const docUrl = messageData.message?.documentMessage?.url;
            const docMimeType = messageData.message?.documentMessage?.mimetype;
            if (docUrl && docMimeType?.includes('pdf')) {
                return await processPDF(docUrl);
            }
            break;

        case 'audioMessage':
            const audioUrl = messageData.message?.audioMessage?.url;
            if (audioUrl) {
                return await processAudio(audioUrl);
            }
            break;
    }

    return null;
}
