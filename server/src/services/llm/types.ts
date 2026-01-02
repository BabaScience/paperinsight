export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

export interface LLMProvider {
  chat(params: ChatParams): Promise<string>;
  chatStream(params: ChatParams, callbacks: StreamCallbacks): Promise<void>;
}

