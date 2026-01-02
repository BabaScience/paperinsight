import OpenAI from 'openai';
import { env } from '../../config/env.js';
import type { LLMProvider, ChatParams, StreamCallbacks } from './types.js';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  async chat(params: ChatParams): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: params.messages,
        temperature: params.temperature || 0.3,
        max_tokens: params.maxTokens || 1500,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw error;
    }
  }

  async chatStream(params: ChatParams, callbacks: StreamCallbacks): Promise<void> {
    try {
      const stream = await this.client.chat.completions.create({
        model: 'gpt-4o',
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

