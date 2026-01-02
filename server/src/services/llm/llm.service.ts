import { env } from '../../config/env.js';
import { OpenAIProvider } from './openai.provider.js';
import { DeepSeekProvider } from './deepseek.provider.js';
import type { LLMProvider, ChatParams, StreamCallbacks } from './types.js';

export type LLMProviderName = 'openai' | 'deepseek';

export const AVAILABLE_PROVIDERS: { name: LLMProviderName; label: string; description: string; requiresApiKey: boolean }[] = [
  { name: 'openai', label: 'OpenAI GPT-4o', description: 'Most capable model, best for complex analysis', requiresApiKey: true },
  { name: 'deepseek', label: 'DeepSeek', description: 'Cost-effective alternative with strong performance', requiresApiKey: true },
];

class LLMService {
  private providers: Map<string, LLMProvider>;

  constructor() {
    this.providers = new Map();
    
    // Only initialize providers that have required configuration
    if (env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider());
    }
    if (env.DEEPSEEK_API_KEY) {
      this.providers.set('deepseek', new DeepSeekProvider());
    }
  }

  /**
   * Get list of available (configured) providers
   */
  getAvailableProviders(): LLMProviderName[] {
    return Array.from(this.providers.keys()) as LLMProviderName[];
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  getProvider(providerName?: string): LLMProvider {
    const provider = providerName || env.DEFAULT_LLM_PROVIDER;
    const instance = this.providers.get(provider);
    
    if (!instance) {
      console.warn(`Provider '${provider}' not found, falling back to default`);
      return this.providers.get(env.DEFAULT_LLM_PROVIDER)!;
    }
    
    return instance;
  }

  async chat(providerName: string | undefined, params: ChatParams): Promise<string> {
    const provider = this.getProvider(providerName);
    return provider.chat(params);
  }

  async chatStream(
    providerName: string | undefined,
    params: ChatParams,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const provider = this.getProvider(providerName);
    return provider.chatStream(params, callbacks);
  }
}

export const llmService = new LLMService();
export type { ChatParams, StreamCallbacks, ChatMessage } from './types.js';

