import type { AIConfig } from '../models/common';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  updateConfig(config: AIConfig): void {
    this.config = config;
  }

  async testConnection(): Promise<{ success: boolean; latency: number; model?: string; error?: string }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(this.config.timeout),
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 10,
        }),
      });

      const latency = Date.now() - start;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = (errorData as { error?: { message?: string } })?.error?.message || `HTTP ${response.status}`;
        return { success: false, latency, error: errorMsg };
      }

      return { success: true, latency, model: this.config.model };
    } catch (err) {
      const latency = Date.now() - start;
      const error = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, latency, error };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return [];
      const data = await response.json();
      const models = (data as { data?: { id: string }[] }).data ?? [];
      return models.map((m) => m.id).sort();
    } catch {
      return [];
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      signal: AbortSignal.timeout(this.config.timeout),
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } })?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return (data as { choices: { message: { content: string } }[] }).choices[0].message.content;
  }

  async streamChat(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(this.config.timeout * 2),
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } })?.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = (json as { choices: { delta: { content?: string } }[] }).choices[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              callbacks.onToken(delta);
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      callbacks.onComplete(fullText);
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  static extractJsonFromResponse(text: string): Record<string, unknown> | null {
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonBlockRegex);
    if (match) {
      try {
        return JSON.parse(match[1]) as Record<string, unknown>;
      } catch {
        // Try parsing without code block
      }
    }

    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
      }
    } catch {
      // Failed to parse
    }

    return null;
  }
}
