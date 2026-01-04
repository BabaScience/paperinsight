import OpenAI from 'openai';
import { Agent as HttpsAgent } from 'https';
import { env } from '../../config/env.js';
import type { LLMProvider, ChatParams, StreamCallbacks } from './types.js';

/**
 * HTTPS Agent with connection pooling for DeepSeek API
 */
const httpsAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

export class DeepSeekProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    // DeepSeek uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
      maxRetries: 3,
      timeout: 60000,
      httpAgent: httpsAgent,
    });
    this.model = env.DEEPSEEK_MODEL || 'deepseek-chat';
  }

  async chat(params: ChatParams): Promise<string> {
    try {
      console.log(`🔮 DeepSeek request with model: ${this.model}`);
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: params.messages,
        temperature: params.temperature || 0.3,
        max_tokens: params.maxTokens || 1500,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('DeepSeek chat error:', error);
      throw error;
    }
  }

  async chatStream(params: ChatParams, callbacks: StreamCallbacks): Promise<void> {
    try {
      console.log(`🔮 DeepSeek streaming request with model: ${this.model}`);
      
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: params.messages,
        temperature: params.temperature || 0.3,
        max_tokens: params.maxTokens || 1500,
        stream: true,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          fullResponse += token;
          callbacks.onToken(token);
        }
      }

      callbacks.onComplete(fullResponse);
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}

