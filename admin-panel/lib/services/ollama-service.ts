// Ollama AI Service
export interface OllamaConfig {
  enabled: boolean;
  apiUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaService {
  private static readonly CONFIG_KEY = 'ollama_config';
  private static readonly DEFAULT_CONFIG: OllamaConfig = {
    enabled: false,
    apiUrl: 'http://localhost:11434',
    model: 'gemma2:1b',
    temperature: 0.7,
    maxTokens: 2000
  };

  // Konfigürasyonu al
  static async getConfig(): Promise<OllamaConfig> {
    try {
      if (typeof window === 'undefined') return this.DEFAULT_CONFIG;
      
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (stored) {
        return { ...this.DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
      return this.DEFAULT_CONFIG;
    } catch (error) {
      console.error('❌ Ollama config alınamadı:', error);
      return this.DEFAULT_CONFIG;
    }
  }

  // Konfigürasyonu kaydet
  static async saveConfig(config: Partial<OllamaConfig>): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      const currentConfig = await this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(newConfig));
      console.log('✅ Ollama config kaydedildi:', newConfig);
    } catch (error) {
      console.error('❌ Ollama config kaydedilemedi:', error);
      throw error;
    }
  }

  // Ollama sunucusunun durumunu kontrol et
  static async checkHealth(): Promise<{ status: 'online' | 'offline'; models?: string[] }> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled || !config.apiUrl) {
        return { status: 'offline' };
      }

      // Önce uzak sunucu üzerinden kontrol et
      try {
        const response = await fetch('https://api.zerodaysoftware.tr/api/ollama/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
          },
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const data = await response.json();
          return { 
            status: data.status === 'online' ? 'online' : 'offline', 
            models: data.models || []
          };
        }
      } catch (error) {
        console.log('🔄 Uzak sunucu kontrolü başarısız, yerel kontrol deneniyor...');
      }

      // Yerel kontrol
      const response = await fetch(`${config.apiUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 saniye timeout
      });

      if (!response.ok) {
        return { status: 'offline' };
      }

      const data = await response.json();
      const models = data.models?.map((model: any) => model.name) || [];
      
      return { 
        status: 'online', 
        models 
      };
    } catch (error) {
      console.error('❌ Ollama health check failed:', error);
      return { status: 'offline' };
    }
  }

  // Ollama'ya mesaj gönder
  static async sendMessage(
    messages: OllamaMessage[], 
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<OllamaResponse> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled) {
        throw new Error('Ollama is not enabled');
      }

      const model = options?.model || config.model;
      const temperature = options?.temperature ?? config.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? config.maxTokens ?? 2000;
      const stream = options?.stream ?? false;

      const requestBody = {
        messages,
        model,
        temperature,
        maxTokens,
        stream
      };

      console.log('🤖 Ollama Request:', { 
        model, 
        temperature, 
        maxTokens 
      });

      // Önce uzak sunucu üzerinden dene
      try {
        const response = await fetch('https://api.zerodaysoftware.tr/api/ollama/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(60000)
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Ollama Response (Remote):', data);
          return data.data;
        }
      } catch (error) {
        console.log('🔄 Uzak sunucu isteği başarısız, yerel kontrol deneniyor...');
      }

      // Yerel kontrol
      if (!config.apiUrl) {
        throw new Error('Ollama API URL is not configured');
      }

      // Mesajları Ollama formatına çevir
      const prompt = this.formatMessagesForOllama(messages);

      const localRequestBody = {
        model,
        prompt,
        stream,
        options: {
          temperature,
          num_predict: maxTokens,
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 saniye timeout
      
      const response = await fetch(`${config.apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(localRequestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Ollama API Error:', response.status, errorText);
        throw new Error(`Ollama API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Ollama Response (Local):', data);

      return data;
    } catch (error) {
      console.error('❌ Ollama sendMessage error:', error);
      throw error;
    }
  }

  // Mesajları Ollama formatına çevir
  private static formatMessagesForOllama(messages: OllamaMessage[]): string {
    let prompt = '';
    
    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `System: ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `Human: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`;
      }
    }
    
    prompt += 'Assistant: ';
    return prompt;
  }

  // Streaming yanıt al
  static async sendMessageStream(
    messages: OllamaMessage[],
    onChunk: (chunk: string) => void,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<void> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled) {
        throw new Error('Ollama is not enabled');
      }

      const model = options?.model || config.model;
      const temperature = options?.temperature ?? config.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? config.maxTokens ?? 2000;

      const prompt = this.formatMessagesForOllama(messages);

      const requestBody = {
        model,
        prompt,
        stream: true,
        options: {
          temperature,
          num_predict: maxTokens,
        }
      };

      const response = await fetch(`${config.apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                onChunk(data.response);
              }
            } catch (e) {
              // JSON parse hatası, devam et
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Ollama streaming error:', error);
      throw error;
    }
  }

  // Mevcut modelleri listele
  static async getAvailableModels(): Promise<string[]> {
    try {
      const health = await this.checkHealth();
      return health.models || [];
    } catch (error) {
      console.error('❌ Ollama models alınamadı:', error);
      return [];
    }
  }

  // Model indir
  static async pullModel(modelName: string): Promise<void> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled || !config.apiUrl) {
        throw new Error('Ollama is not configured');
      }

      const response = await fetch(`${config.apiUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Model pull failed: ${response.status}`);
      }

      console.log(`✅ Model ${modelName} indiriliyor...`);
    } catch (error) {
      console.error(`❌ Model ${modelName} indirilemedi:`, error);
      throw error;
    }
  }
}
