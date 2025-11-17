import apiService from '../utils/api-service';

export interface OllamaConfig {
  enabled: boolean;
  apiUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OllamaService {
  private static readonly CONFIG_KEY = 'ollama_config';
  private static readonly DEFAULT_CONFIG: OllamaConfig = {
    enabled: false,
    model: 'gemma2:1b',
    temperature: 0.7,
    maxTokens: 2000,
  };

  // Konfigürasyonu al
  static async getConfig(): Promise<OllamaConfig> {
    try {
      const stored = await import('@react-native-async-storage/async-storage').then(
        m => m.default.getItem(this.CONFIG_KEY)
      );
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.DEFAULT_CONFIG, ...parsed };
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
      const currentConfig = await this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error('❌ Ollama config kaydedilemedi:', error);
    }
  }

  // Ollama API'ye mesaj gönder
  static async sendMessage(
    messages: OllamaMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    try {
      const config = await this.getConfig();

      if (!config.enabled) {
        throw new Error('Ollama is not enabled');
      }

      const model = options?.model || config.model || this.DEFAULT_CONFIG.model;
      const temperature = options?.temperature ?? config.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? config.maxTokens ?? 2000;

      // Backend API'ye istek gönder
      const response = await apiService.post('/ollama/generate', {
        messages,
        model,
        temperature,
        maxTokens,
      });

      if (response.success && response.data) {
        // Ollama response format'ını kontrol et
        if (typeof response.data.response === 'string') {
          return response.data.response;
        }
        if (typeof response.data === 'string') {
          return response.data;
        }
        if (response.data.text) {
          return response.data.text;
        }
        // Fallback: JSON stringify
        return JSON.stringify(response.data);
      }

      throw new Error('Invalid Ollama response');
    } catch (error: any) {
      console.error('❌ Ollama send message error:', error);
      throw error;
    }
  }

  // Ollama durumunu kontrol et
  static async checkStatus(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      if (!config.enabled) {
        return false;
      }

      // Basit bir test mesajı gönder
      const testResponse = await this.sendMessage(
        [{ role: 'user', content: 'test' }],
        { maxTokens: 10 }
      );
      return !!testResponse;
    } catch (error) {
      console.error('❌ Ollama status check error:', error);
      return false;
    }
  }
}

