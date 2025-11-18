import { ChatMessage, QuickReply } from '../components/Chatbot';
import { AnythingLLMService } from './AnythingLLMService';
import { OllamaService } from './OllamaService';
import { Linking } from 'react-native';
import { apiService } from '../utils/api-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../utils/types';
import { Order } from '../utils/types';

export interface ChatbotResponse {
  text: string;
  type?: 'text' | 'quick_reply' | 'product' | 'order' | 'image' | 'product_card' | 'order_card' | 'voice';
  quickReplies?: QuickReply[];
  data?: any;
  product?: Product;
  order?: Order;
}

export class ChatbotService {
  private static intents: { [key: string]: string[] } = {
    greeting: [
      'merhaba', 'selam', 'hey', 'hi', 'hello', 'iyi günler', 'günaydın', 'iyi akşamlar'
    ],
    order_tracking: [
      'sipariş', 'takip', 'nerede', 'kargo', 'teslimat', 'sipariş takibi', 'siparişim'
    ],
    product_search: [
      'ürün', 'arama', 'bul', 'var mı', 'stok', 'fiyat', 'ürün arama'
    ],
    campaigns: [
      'kampanya', 'indirim', 'kupon', 'çek', 'promosyon', 'fırsat', 'özel teklif'
    ],
    recommendations: [
      'öneri', 'bana ne önerirsin', 'ne alsam', 'beni tanı', 'kişisel öneri', 'kişiselleştir'
    ],
    support: [
      'yardım', 'destek', 'problem', 'sorun', 'şikayet', 'canlı destek'
    ],
    payment: [
      'ödeme', 'para', 'kredi kartı', 'banka', 'ücret', 'fatura', 'taksit'
    ],
    return: [
      'iade', 'değişim', 'geri', 'kusur', 'hasarlı', 'yanlış'
    ],
    shipping: [
      'kargo', 'teslimat', 'gönderim', 'ulaştırma', 'adres'
    ],
    account: [
      'hesap', 'profil', 'şifre', 'giriş', 'kayıt', 'üyelik'
    ],
    goodbye: [
      'görüşürüz', 'hoşça kal', 'bye', 'teşekkür', 'sağ ol', 'kapanış'
    ]
  };

  private static quickResponses: { [key: string]: ChatbotResponse } = {
    greeting: {
      text: '👋 Merhaba! Size nasıl yardımcı olabilirim?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
        { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
        { id: '3', text: '❓ S.S.S.', action: 'faq' },
        { id: '4', text: '🎧 Canlı Destek', action: 'live_support' },
      ]
    },
    order_tracking: {
      text: '📦 Sipariş takibi için sipariş numaranızı paylaşabilir misiniz? Veya "Siparişlerim" sayfasından tüm siparişlerinizi görüntüleyebilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📋 Siparişlerim', action: 'view_orders' },
        { id: '2', text: '🔢 Numara Gir', action: 'enter_order_number' },
        { id: '3', text: '📞 Destek Çağır', action: 'live_support' },
      ]
    },
    product_search: {
      text: '🔍 Hangi ürünü arıyorsunuz? Ürün adını yazabilir veya kategorilere göz atabilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🏕️ Kamp Malzemeleri', action: 'search_category_kamp' },
        { id: '2', text: '🎯 Avcılık', action: 'search_category_avcilik' },
        { id: '3', text: '🎣 Balıkçılık', action: 'search_category_balik' },
        { id: '4', text: '👕 Giyim', action: 'search_category_giyim' },
      ]
    },
    campaigns: {
      text: '🎁 Aktif kampanyaları gösterebilirim veya size en uygun kampanyayı önerebilirim.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🎁 Aktif Kampanyalar', action: 'view_campaigns' },
        { id: '2', text: '✅ Uygun Kampanyam Var mı?', action: 'check_campaign_eligibility' },
        { id: '3', text: 'ℹ️ Kampanya Detayları', action: 'campaign_info' },
      ]
    },
    recommendations: {
      text: '⭐ Sizin için kişiselleştirilmiş ürün ve teklif önerileri sunabilirim.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⭐ Ürün Önerileri', action: 'show_recommendations' },
        { id: '2', text: '🎯 Bana Özel Kampanyalar', action: 'check_campaign_eligibility' },
        { id: '3', text: '🛒 Popüler Ürünler', action: 'view_products' },
      ]
    },
    support: {
      text: '🎧 Size nasıl yardımcı olabilirim? Sorununuzu açıklayabilir veya canlı desteğe bağlanabilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📞 Canlı Destek', action: 'live_support' },
        { id: '2', text: '📧 E-posta Gönder', action: 'email_support' },
        { id: '3', text: '❓ S.S.S.', action: 'faq' },
        { id: '4', text: '📱 WhatsApp', action: 'whatsapp_support' },
      ]
    },
    payment: {
      text: '💳 Ödeme ile ilgili hangi konuda yardıma ihtiyacınız var?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '💰 Ödeme Yöntemleri', action: 'payment_methods' },
        { id: '2', text: '📊 Taksit Seçenekleri', action: 'installment_options' },
        { id: '3', text: '🧾 Fatura Sorunu', action: 'invoice_issue' },
        { id: '4', text: '🔒 Güvenlik', action: 'payment_security' },
      ]
    },
    return: {
      text: '↩️ İade işlemi için size yardımcı olabilirim. Ne yapmak istiyorsunuz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📝 İade Talebi Oluştur', action: 'create_return' },
        { id: '2', text: '📋 İade Taleplerim', action: 'view_returns' },
        { id: '3', text: '❓ İade Koşulları', action: 'return_policy' },
        { id: '4', text: '🚚 İade Kargo', action: 'return_shipping' },
      ]
    },
    shipping: {
      text: '🚚 Kargo ve teslimat hakkında hangi bilgiye ihtiyacınız var?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⏰ Teslimat Süreleri', action: 'delivery_times' },
        { id: '2', text: '💰 Kargo Ücretleri', action: 'shipping_costs' },
        { id: '3', text: '📍 Teslimat Adresi', action: 'delivery_address' },
        { id: '4', text: '📦 Kargo Takibi', action: 'track_shipment' },
      ]
    },
    account: {
      text: '👤 Hesap işlemleri için size nasıl yardımcı olabilirim?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🔐 Şifre Sıfırlama', action: 'reset_password' },
        { id: '2', text: '📝 Profil Güncelleme', action: 'update_profile' },
        { id: '3', text: '📧 E-posta Değiştir', action: 'change_email' },
        { id: '4', text: '🏠 Adres Ekle', action: 'add_address' },
      ]
    },
    goodbye: {
      text: '👋 Teşekkür ederim! Başka bir sorunuz olursa her zaman buradayım. İyi günler!',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⭐ Değerlendir', action: 'rate_chat' },
        { id: '2', text: '🔄 Yeni Sohbet', action: 'new_chat' },
      ]
    }
  };

  private static faqData: { [key: string]: string } = {
    'sipariş nasıl takip': 'Siparişinizi takip etmek için "Hesabım > Siparişlerim" bölümüne gidin veya sipariş numaranızla takip yapın.',
    'kargo ücreti': '150 TL ve üzeri alışverişlerde kargo ücretsizdir. Altındaki siparişler için 19,90 TL kargo ücreti alınır.',
    'iade nasıl': 'Ürünü teslim aldığınız tarihten itibaren 14 gün içinde iade edebilirsiniz. "İade Taleplerim" bölümünden işlem yapın.',
    'ödeme yöntemleri': 'Kredi kartı, banka kartı, havale/EFT seçenekleri mevcuttur. Kapıda ödeme bulunmamaktadır.',
    'teslimat süresi': 'Stokta bulunan ürünler 1-3 iş günü içinde kargoya verilir. Teslimat süresi 1-5 iş günüdür.',
    'taksit': 'Kredi kartınızla 2, 3, 6, 9 ve 12 aya varan taksit seçenekleri kullanabilirsiniz.',
    'şifre unuttum': 'Giriş ekranında "Şifremi Unuttum" linkine tıklayın ve e-posta adresinizi girin.',
    'stok': 'Ürün sayfasında stok durumu gösterilir. Stokta olmayan ürünler için "Stok gelince haber ver" seçeneğini kullanın.'
  };

  static async processMessage(message: string, actionType: string = 'text', productId?: number, userId?: number): Promise<ChatMessage> {
    const timestamp = new Date();
    // GÜVENLİK: Kriptografik olarak güvenli message ID
    let messageId: string;
    try {
      const cryptoUtils = await import('../utils/crypto-utils');
      messageId = cryptoUtils.generateSecureMessageId();
    } catch (error) {
      // Fallback: Basit message ID
      messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    try {
      // Backend API'ye mesaj gönder (userId parametresi varsa onu kullan)
      const activeUserId = userId !== undefined ? userId : await this.getActiveUserId();
      
      let response;
      try {
        response = await apiService.post('/chatbot/message', {
          message,
          actionType,
          userId: activeUserId || null,
          productId: productId || undefined
        });
      } catch (apiError: any) {
        console.error('❌ Chatbot API error:', apiError);
        throw new Error(apiError?.message || 'API isteği başarısız');
      }

      if (response && response.success && response.data) {
        // Backend'den gelen yanıtı kullan
        let quickReplies = response.data.quickReplies;
        
        // live_support action'ı için telefon butonlarını filtrele (sadece "Telefon Et" kalsın)
        if (actionType === 'live_support' && quickReplies && Array.isArray(quickReplies)) {
          quickReplies = quickReplies.filter((reply: QuickReply) => {
            // "Telefon" butonunu kaldır, sadece "Telefon Et" kalsın
            if (reply.action === 'phone_support' || (reply.text && reply.text.includes('📞 Telefon') && !reply.text.includes('Telefon Et'))) {
              return false;
            }
            return true;
          });
        }
        
        return {
          id: response.data.id || messageId,
          text: response.data.text || 'Yanıt alınamadı',
          isBot: true,
          timestamp: new Date(response.data.timestamp || timestamp),
          type: response.data.type || 'text',
          quickReplies: quickReplies || [],
          data: response.data.data,
          product: response.data.product,
          order: response.data.order,
        };
      } else {
        throw new Error(response?.message || 'Backend response failed');
      }
    } catch (error) {
      console.error('❌ Backend chatbot error, using fallback:', error);
      
      // Fallback: Yerel işleme
      const localResponse = await this.processMessageLocally(message, actionType, messageId, timestamp);
      
      // live_support için telefon butonlarını filtrele
      if (actionType === 'live_support' && localResponse.quickReplies && Array.isArray(localResponse.quickReplies)) {
        localResponse.quickReplies = localResponse.quickReplies.filter((reply: QuickReply) => {
          // "Telefon" butonunu kaldır, sadece "Telefon Et" kalsın
          if (reply.action === 'phone_support' || (reply.text && reply.text.includes('📞 Telefon') && !reply.text.includes('Telefon Et'))) {
            return false;
          }
          return true;
        });
      }
      
      return localResponse;
    }
  }

  private static async processMessageLocally(message: string, actionType: string, messageId: string, timestamp: Date): Promise<ChatMessage> {
    // Özel eylem tipleri
    if (actionType !== 'text') {
      return await this.handleSpecialAction(actionType, message, messageId, timestamp);
    }

    // Mesaj analizi
    const intent = this.detectIntent(message.toLowerCase());
    const response = await this.generateResponse(intent, message);

    return {
      id: messageId,
      text: response.text,
      isBot: true,
      timestamp,
      type: response.type || 'text',
      quickReplies: response.quickReplies,
      data: response.data,
      product: response.product,
      order: response.order,
    };
  }

  private static detectIntent(message: string): string {
    // Önce S.S.S. veritabanında ara
    for (const [key, answer] of Object.entries(this.faqData)) {
      if (message.includes(key)) {
        return 'faq_match';
      }
    }

    // Intent tespiti
    for (const [intent, keywords] of Object.entries(this.intents)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          return intent;
        }
      }
    }

    // Sipariş numarası tespiti
    if (/\b\d{5,}\b/.test(message)) {
      return 'order_number';
    }

    // Ürün arama tespiti
    if (message.length > 3 && !this.quickResponses[message]) {
      return 'product_search_query';
    }

    return 'unknown';
  }

  private static async generateResponse(intent: string, message: string): Promise<ChatbotResponse> {
    // AnythingLLM ile akıllı yanıt dene
    const llmResponse = await this.tryAnythingLLMResponse(intent, message);
    if (llmResponse) {
      return llmResponse;
    }

    // Fallback: Geleneksel rule-based yanıtlar
    switch (intent) {
      case 'faq_match':
        return this.handleFAQQuery(message);

      case 'order_number':
        return await this.handleOrderTrackingLocal(message);

      case 'product_search_query':
        return await this.handleProductSearchLocal(message);

      case 'show_product_card':
        return await this.handleProductCard(message);

      case 'show_order_card':
        return await this.handleOrderCard(message);

      case 'campaigns':
        return await this.handleCampaignsLocal();

      case 'recommendations':
        return await this.handleRecommendationsLocal();

      case 'unknown':
        return {
          text: '🤔 Tam olarak anlayamadım. Size nasıl yardımcı olabileceğimi belirtir misiniz?',
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
            { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
            { id: '4', text: '❓ S.S.S.', action: 'faq' },
            { id: '5', text: '⚙️ LLM Ayarları', action: 'llm_settings' },
          ]
        };

      default:
        return this.quickResponses[intent] || this.quickResponses.greeting;
    }
  }

  private static async tryAnythingLLMResponse(intent: string, message: string): Promise<ChatbotResponse | null> {
    try {
      // Önce Ollama'yı dene
      const ollamaResponse = await this.tryOllamaResponse(intent, message);
      if (ollamaResponse) {
        return ollamaResponse;
      }

      // Ollama başarısız olursa AnythingLLM'i dene
      const config = await AnythingLLMService.getConfig();
      
      if (!config || !config.enabled) {
        console.log('🔧 AnythingLLM disabled or config missing, using fallback');
        return null; // AnythingLLM aktif değil, fallback kullan
      }

      // Basit greeting ve goodbye için LLM kullanma
      if (['greeting', 'goodbye'].includes(intent)) {
        return null;
      }

      // Mesaj çok kısa veya boşsa LLM kullanma
      if (!message || message.trim().length < 3) {
        return null;
      }

      // Kapsamlı sistem promptu oluştur
      const systemPrompt = this.buildSystemPrompt(intent, message);
      const enhancedMessage = `${systemPrompt}\n\nKullanıcı Mesajı: ${message}`;

      // AnythingLLM'den yanıt al (timeout ile)
      const llmText = await Promise.race([
        AnythingLLMService.getSmartResponse(enhancedMessage),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('LLM timeout')), 15000)
        )
      ]);
      
      // Yanıt kontrolü
      if (llmText && 
          typeof llmText === 'string' && 
          llmText.length > 10 && 
          llmText.length < 1000 &&
          !llmText.toLowerCase().includes('anythingllm') &&
          !llmText.toLowerCase().includes('error') &&
          !llmText.toLowerCase().includes('bağlan')) {
        
        console.log('✅ AnythingLLM successful response');
        // Başarılı LLM yanıtı
        return {
          text: `🤖 ${llmText}`,
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '✅ Yardımcı Oldu', action: 'satisfied' },
            { id: '2', text: '❓ Daha Fazla Bilgi', action: 'more_info' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
            { id: '4', text: '🏠 Ana Menü', action: 'greeting' },
          ]
        };
      } else {
        console.log('⚠️ AnythingLLM response not suitable, using fallback');
        // LLM yanıtı uygun değil, fallback kullan
        return null;
      }
    } catch (error: any) {
      console.error('❌ LLM Response Error:', error?.message || error);
      return null; // Hata durumunda fallback kullan
    }
  }

  // Ollama API ile yanıt dene
  private static async tryOllamaResponse(intent: string, message: string): Promise<ChatbotResponse | null> {
    try {
      const config = await OllamaService.getConfig();
      
      if (!config || !config.enabled) {
        console.log('🔧 Ollama disabled or config missing');
        return null; // Ollama aktif değil
      }

      // Ollama durumunu kontrol et
      try {
        const isAvailable = await OllamaService.checkStatus();
        if (!isAvailable) {
          console.log('⚠️ Ollama service not available');
          return null;
        }
      } catch (statusError) {
        console.log('⚠️ Ollama status check failed:', statusError);
        return null;
      }

      // Basit greeting ve goodbye için Ollama kullanma
      if (['greeting', 'goodbye'].includes(intent)) {
        return null;
      }

      // Mesaj çok kısa veya boşsa Ollama kullanma
      if (!message || message.trim().length < 3) {
        return null;
      }

      // Kapsamlı sistem promptu oluştur
      const systemPrompt = this.buildSystemPrompt(intent, message);
      
      // Ollama mesaj formatı
      const ollamaMessages = [
        {
          role: 'system' as const,
          content: systemPrompt
        },
        {
          role: 'user' as const,
          content: message
        }
      ];

      console.log('🤖 Ollama request sending...', { intent, messageLength: message.length });

      // Ollama'dan yanıt al (timeout ile - API servisinde zaten 120 saniye timeout var)
      // Burada ek bir güvenlik timeout'u ekliyoruz (90 saniye)
      const ollamaText = await Promise.race([
        OllamaService.sendMessage(ollamaMessages),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('Ollama timeout - yanıt çok uzun sürdü')), 90000)
        )
      ]);
      
      // Yanıt kontrolü
      if (ollamaText && 
          typeof ollamaText === 'string' && 
          ollamaText.trim().length > 10 && 
          ollamaText.trim().length < 2000 &&
          !ollamaText.toLowerCase().includes('ollama') &&
          !ollamaText.toLowerCase().includes('error') &&
          !ollamaText.toLowerCase().includes('bağlan') &&
          !ollamaText.toLowerCase().includes('connection')) {
        
        console.log('✅ Ollama successful response', { length: ollamaText.length });
        // Başarılı Ollama yanıtı
        return {
          text: ollamaText.trim(),
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '✅ Yardımcı Oldu', action: 'satisfied' },
            { id: '2', text: '❓ Daha Fazla Bilgi', action: 'more_info' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
            { id: '4', text: '🏠 Ana Menü', action: 'greeting' },
          ]
        };
      } else {
        console.log('⚠️ Ollama response not suitable, trying fallback', { 
          hasText: !!ollamaText,
          length: ollamaText?.length,
          type: typeof ollamaText
        });
        return null;
      }
    } catch (error: any) {
      // Timeout veya network hatalarını sessizce geç, diğer hataları logla
      if (error?.message?.includes('timeout') || error?.message?.includes('network')) {
        console.log('⚠️ Ollama timeout or network error, using fallback');
      } else {
        console.error('❌ Ollama Response Error:', error?.message || error);
      }
      return null; // Hata durumunda fallback kullan
    }
  }

  // Kapsamlı sistem promptu oluştur
  private static buildSystemPrompt(intent: string, message: string): string {
    const basePrompt = `Sen Huğlu Outdoor'un profesyonel müşteri hizmetleri asistanısın. Görevin kullanıcılara av, kamp, balık tutma ve outdoor giyim ürünleri hakkında yardımcı olmak.

## ŞİRKET BİLGİLERİ
- Şirket Adı: Huğlu Outdoor
- Sektör: Av, Kamp, Balık Tutma, Outdoor Giyim
- Marka: Huğlu Outdoor
- Uzmanlık: Av malzemeleri, kamp ekipmanları, balık tutma aletleri, outdoor giyim

## ÜRÜN KATEGORİLERİ
1. Av Malzemeleri:
   - Tüfekler ve av silahları
   - Fişek ve mühimmat
   - Av giyim (mont, pantolon, bot, eldiven)
   - Av aksesuarları (çanta, dürbün, pusula)
   - Av köpekleri için ekipmanlar

2. Kamp Ekipmanları:
   - Çadırlar (2-8 kişilik)
   - Uyku tulumları ve matlar
   - Kamp mobilyaları (sandalye, masa)
   - Kamp mutfak ekipmanları
   - Aydınlatma ve ısıtma

3. Balık Tutma:
   - Olta takımları
   - Misina ve iğneler
   - Yemler ve balık çekicileri
   - Balık giyim (yağmurluk, çizme)
   - Balık tutma aksesuarları

4. Outdoor Giyim:
   - Montlar ve ceketler
   - Pantolonlar ve şortlar
   - Botlar ve ayakkabılar
   - Çantalar (sırt çantası, bel çantası)
   - Aksesuarlar (şapka, eldiven, atkı)

## KARGO VE TESLİMAT
- Ücretsiz Kargo: 150 TL ve üzeri siparişlerde
- Kargo Ücreti: 150 TL altı siparişlerde 19.90 TL
- Teslimat Süresi: 1-5 iş günü
- Kargo Firmaları: Yurtiçi Kargo, MNG Kargo, Aras Kargo
- Adres Değişikliği: Kargo çıkmadan önce yapılabilir

## ÖDEME SEÇENEKLERİ
- Kredi Kartı: Visa, Mastercard
- Banka Kartı: Tüm bankalar
- Havale/EFT: Banka hesabına transfer
- Kapıda Ödeme: Nakit veya kartla
- Taksit Seçenekleri: 2, 3, 6, 9, 12 ay

## İADE VE DEĞİŞİM
- İade Süresi: 14 gün (ürün alındıktan sonra)
- Koşullar: Orijinal ambalajında, etiketli, kullanılmamış
- İade Ücreti: Ücretsiz (150 TL üzeri), 19.90 TL (altı)
- Değişim: Aynı ürün farklı beden/renk için mümkün

## SİPARİŞ DURUMLARI
- Beklemede: Sipariş alındı, onay bekleniyor
- Onaylandı: Sipariş onaylandı, hazırlanıyor
- Hazırlanıyor: Ürünler paketleniyor
- Kargoda: Kargo şirketine teslim edildi
- Teslim Edildi: Müşteriye ulaştı
- İptal Edildi: Sipariş iptal edildi

## İLETİŞİM BİLGİLERİ
- Telefon: 0530 312 58 13
- WhatsApp: +90 530 312 58 13
- E-posta: info@hugluoutdoor.com
- Çalışma Saatleri: Hafta içi 09:00-18:00

## YANIT KURALLARI
1. Her zaman nazik, profesyonel ve yardımsever ol
2. Türkçe yanıt ver, samimi ama resmi dil kullan
3. Ürün önerilerinde kullanıcının ihtiyacını anla
4. Sipariş sorularında detaylı bilgi ver
5. Bilmediğin konularda canlı desteğe yönlendir
6. Kısa ve öz yanıtlar ver (maksimum 3-4 cümle)
7. Emoji kullanımını dengeli tut (her cümlede değil)
8. Ürün fiyatları ve stok durumu hakkında kesin bilgi verme, "Ürünler sayfasından kontrol edebilirsiniz" de

## MEVCUT INTENT
Intent: ${intent}
Kullanıcı Mesajı: "${message}"`;

    // Intent'e özel ek bilgiler
    let intentSpecificInfo = '';
    
    switch (intent) {
      case 'product_search':
      case 'product_search_query':
        intentSpecificInfo = `
## ÖNEMLİ: ÜRÜN ARAMA
Kullanıcı ürün arıyor veya ürün hakkında soru soruyor.
- Ürün önerilerinde kullanıcının ihtiyacını anlamaya çalış
- Kategorilere göre yönlendirme yap
- Fiyat ve stok bilgisi için "Ürünler sayfasından kontrol edebilirsiniz" de
- Benzer ürünler önerebilirsin`;
        break;

      case 'order_tracking':
        intentSpecificInfo = `
## ÖNEMLİ: SİPARİŞ TAKİBİ
Kullanıcı sipariş takibi yapıyor.
- Sipariş numarası varsa kontrol et
- Sipariş durumunu açıkla
- Kargo bilgisi varsa paylaş
- Sorun varsa canlı desteğe yönlendir`;
        break;

      case 'support':
        intentSpecificInfo = `
## ÖNEMLİ: DESTEK
Kullanıcı destek arıyor.
- Sorununu anlamaya çalış
- Çözüm öner
- Gerekirse canlı desteğe yönlendir
- İletişim bilgilerini paylaş`;
        break;

      case 'payment':
        intentSpecificInfo = `
## ÖNEMLİ: ÖDEME
Kullanıcı ödeme hakkında soru soruyor.
- Ödeme yöntemlerini açıkla
- Taksit seçeneklerini belirt
- Güvenlik bilgisi ver
- Sorun varsa destek ekibine yönlendir`;
        break;

      case 'return':
        intentSpecificInfo = `
## ÖNEMLİ: İADE/DEĞİŞİM
Kullanıcı iade veya değişim istiyor.
- İade koşullarını açıkla
- Süreç hakkında bilgi ver
- Gerekli belgeleri söyle
- İade formu için yönlendir`;
        break;

      case 'shipping':
        intentSpecificInfo = `
## ÖNEMLİ: KARGO/TESLİMAT
Kullanıcı kargo veya teslimat hakkında soru soruyor.
- Kargo ücretlerini açıkla
- Teslimat süresini belirt
- Kargo firmalarını söyle
- Adres değişikliği hakkında bilgi ver`;
        break;

      default:
        intentSpecificInfo = '';
    }

    return basePrompt + intentSpecificInfo;
  }

  // Eski buildContextForLLM fonksiyonu (geriye dönük uyumluluk için)
  private static buildContextForLLM(intent: string, message: string): string {
    return this.buildSystemPrompt(intent, message);
  }

  private static handleFAQQuery(message: string): ChatbotResponse {
    for (const [key, answer] of Object.entries(this.faqData)) {
      if (message.includes(key)) {
        return {
          text: `💡 ${answer}`,
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '✅ Yeterli', action: 'satisfied' },
            { id: '2', text: '❓ Daha Fazla', action: 'faq' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
          ]
        };
      }
    }

    return {
      text: '🔍 S.S.S. bölümümüzde bu sorunun cevabını bulamadım. Canlı destek ile iletişime geçebilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '❓ S.S.S. Gör', action: 'faq' },
        { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
      ]
    };
  }

  private static async handleOrderTrackingLocal(message: string): Promise<ChatbotResponse> {
    const orderNumber = message.match(/\b\d{5,}\b/)?.[0];
    
    if (orderNumber) {
      return {
        text: `📦 ${orderNumber} numaralı siparişinizi kontrol ediyorum...\n\n⚠️ Sipariş detayları için lütfen "Siparişlerim" sayfasına gidin veya canlı destek ile iletişime geçin.`,
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📋 Siparişlerim', action: 'navigate_orders' },
          { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
          { id: '3', text: '🔢 Başka Numara', action: 'enter_order_number' },
        ]
      };
    }

    return this.quickResponses.order_tracking;
  }

  private static async handleProductSearchLocal(query: string): Promise<ChatbotResponse> {
    try {
      // Arama sorgusunu temizle
      const searchQuery = query.trim();
      
      if (!searchQuery || searchQuery.length < 2) {
        return {
          text: '🔍 Lütfen en az 2 karakter girin.',
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '🏕️ Kamp Malzemeleri', action: 'search_category_kamp' },
            { id: '2', text: '🎯 Avcılık', action: 'search_category_avcilik' },
            { id: '3', text: '🎣 Balıkçılık', action: 'search_category_balik' },
            { id: '4', text: '👕 Giyim', action: 'search_category_giyim' },
          ]
        };
      }

      // ProductController ile ürün ara
      const { ProductController } = await import('../controllers/ProductController');
      const products = await ProductController.searchProducts(searchQuery);

      if (!products || products.length === 0) {
        return {
          text: `🔍 "${searchQuery}" için ürün bulunamadı.\n\nBaşka bir arama terimi deneyebilir veya kategorilere göz atabilirsiniz.`,
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '🛒 Tüm Ürünler', action: 'view_products' },
            { id: '2', text: '🏕️ Kamp Malzemeleri', action: 'search_category_kamp' },
            { id: '3', text: '🎯 Avcılık', action: 'search_category_avcilik' },
            { id: '4', text: '🎣 Balıkçılık', action: 'search_category_balik' },
            { id: '5', text: '👕 Giyim', action: 'search_category_giyim' },
          ]
        };
      }

      // İlk 3 ürünü göster
      const topProducts = products.slice(0, 3);
      const productCards = topProducts.map((product, index) => ({
        id: `product-${product.id}`,
        text: `📦 ${product.name}\n💰 ${ProductController.formatPrice(product.price)}${product.stock > 0 ? ' ✅ Stokta' : ' ❌ Stokta Yok'}`,
        isBot: true,
        timestamp: new Date(),
        type: 'product_card' as const,
        product: product,
      }));

      // Eğer 3'ten fazla ürün varsa bilgi ver
      const moreProductsText = products.length > 3 
        ? `\n\n💡 Toplam ${products.length} ürün bulundu. Tüm sonuçları görmek için "Ürünler" sayfasına gidebilirsiniz.`
        : '';

      return {
        text: `🔍 "${searchQuery}" için ${products.length} ürün bulundu:${moreProductsText}`,
        type: 'text',
        // İlk ürünü direkt göster, diğerlerini ayrı mesajlar olarak ekleyeceğiz
        data: {
          products: topProducts,
          totalCount: products.length,
          query: searchQuery
        }
      };
    } catch (error: any) {
      console.error('Product search error:', error);
      return {
        text: `❌ Ürün arama sırasında bir hata oluştu. Lütfen tekrar deneyin.`,
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🛒 Ürünlere Git', action: 'view_products' },
          { id: '2', text: '🔄 Tekrar Dene', action: 'product_search' },
        ]
      };
    }
  }

  private static async handleCampaignsLocal(): Promise<ChatbotResponse> {
    return {
      text: '🎁 Aktif kampanyaları kontrol ediyorum...\n\n⚠️ Kampanya bilgileri için lütfen "Kampanyalar" sayfasına gidin.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🎁 Kampanyalar', action: 'view_campaigns' },
        { id: '2', text: '🛒 Ürünlere Göz At', action: 'view_products' },
        { id: '3', text: '⭐ Öneriler', action: 'show_recommendations' },
        { id: '4', text: '🏠 Ana Menü', action: 'greeting' },
      ]
    };
  }

  private static async handleRecommendationsLocal(): Promise<ChatbotResponse> {
    return {
      text: '⭐ Size özel öneriler hazırlıyorum...\n\n⚠️ Kişiselleştirilmiş öneriler için lütfen "Öneriler" sayfasına gidin.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⭐ Öneriler', action: 'show_recommendations' },
        { id: '2', text: '🛒 Popüler Ürünler', action: 'view_products' },
        { id: '3', text: '🎁 Kampanyalar', action: 'view_campaigns' },
        { id: '4', text: '🔍 Ürün Ara', action: 'product_search' },
      ]
    };
  }

  // Ürün kartı göster
  private static async handleProductCard(message: string): Promise<ChatbotResponse> {
    try {
      // Mesajdan ürün ID'sini çıkar
      const productIdMatch = message.match(/ürün[:\s]*(\d+)/i) || message.match(/(\d+)/);
      if (!productIdMatch) {
        return {
          text: 'Ürün ID\'si bulunamadı. Lütfen ürün numarasını belirtin.',
          type: 'text',
        };
      }

      const productId = parseInt(productIdMatch[1], 10);
      const productResponse = await apiService.getProductById(productId);

      if (productResponse.success && productResponse.data) {
        return {
          text: 'Ürün detayları:',
          type: 'product_card',
          data: { product: productResponse.data },
        };
      }

      return {
        text: 'Ürün bulunamadı.',
        type: 'text',
      };
    } catch (error) {
      console.error('Product card error:', error);
      return {
        text: 'Ürün bilgileri alınamadı.',
        type: 'text',
      };
    }
  }

  // Sipariş kartı göster
  private static async handleOrderCard(message: string): Promise<ChatbotResponse> {
    try {
      // Mesajdan sipariş ID'sini çıkar
      const orderIdMatch = message.match(/sipariş[:\s]*(\d+)/i) || message.match(/(\d+)/);
      if (!orderIdMatch) {
        return {
          text: 'Sipariş ID\'si bulunamadı. Lütfen sipariş numarasını belirtin.',
          type: 'text',
        };
      }

      const orderId = parseInt(orderIdMatch[1], 10);
      const orderResponse = await apiService.getOrderById(orderId);

      if (orderResponse.success && orderResponse.data) {
        return {
          text: 'Sipariş detayları:',
          type: 'order_card',
          data: { order: orderResponse.data },
        };
      }

      return {
        text: 'Sipariş bulunamadı.',
        type: 'text',
      };
    } catch (error) {
      console.error('Order card error:', error);
      return {
        text: 'Sipariş bilgileri alınamadı.',
        type: 'text',
      };
    }
  }

  // Gelişmiş AI önerileri (kullanıcı context ile)
  static async getAdvancedRecommendations(userId: number): Promise<ChatbotResponse> {
    try {
      // Kullanıcı geçmişini al
      const userOrdersResponse = await apiService.getUserOrders(userId);
      const orders = userOrdersResponse.success ? (userOrdersResponse.data || []) : [];

      // Son siparişlerden kategori çıkar
      const categories = new Set<string>();
      orders.slice(0, 5).forEach((order: any) => {
        if (order.items) {
          order.items.forEach((item: any) => {
            if (item.product?.category) {
              categories.add(item.product.category);
            }
          });
        }
      });

      // ML servisi entegrasyonu (gelecekte)
      // Şimdilik basit öneriler
      const categoryArray = Array.from(categories);
      
      if (categoryArray.length > 0) {
        return {
          text: `Size özel öneriler hazırladım! Son alışverişlerinize göre ${categoryArray.join(', ')} kategorilerinde ürünler önerebilirim.`,
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '⭐ Önerileri Gör', action: 'view_products', data: { categories: categoryArray } },
            { id: '2', text: '🎁 Kampanyalar', action: 'view_campaigns' },
            { id: '3', text: '🛒 Tüm Ürünler', action: 'view_products' },
          ],
        };
      }

      return {
        text: 'Size özel öneriler için alışveriş yapmanız gerekiyor.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🛒 Ürünlere Göz At', action: 'view_products' },
          { id: '2', text: '🎁 Kampanyalar', action: 'view_campaigns' },
        ],
      };
    } catch (error) {
      console.error('Advanced recommendations error:', error);
      return {
        text: 'Öneriler hazırlanırken bir hata oluştu.',
        type: 'text',
      };
    }
  }

  private static async handleSpecialAction(
    action: string, 
    message: string, 
    messageId: string, 
    timestamp: Date
  ): Promise<ChatMessage> {
    const responses: { [key: string]: ChatbotResponse } = {
      live_support: {
        text: '🎧 Canlı desteğe bağlanıyorsunuz... Ortalama bekleme süresi: 2-3 dakika\n\n📞 Telefon: 0530 312 58 13\n📱 WhatsApp: +90 530 312 58 13\n📧 E-posta: info@hugluoutdoor.com',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📞 Telefon Et', action: 'call_support' },
          { id: '2', text: '📱 WhatsApp', action: 'whatsapp_support' },
          { id: '3', text: '📧 E-posta', action: 'email_support' },
        ]
      },
      
      faq: {
        text: '❓ S.S.S. sayfamızda en sık sorulan soruların cevaplarını bulabilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📖 S.S.S. Gör', action: 'view_faq' },
          { id: '2', text: '🔍 Soru Ara', action: 'search_faq' },
          { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },

      view_orders: {
        text: '📋 Siparişlerinizi görüntülemek için "Hesabım > Siparişlerim" sayfasına yönlendiriyorum.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📱 Siparişlerime Git', action: 'navigate_orders' },
          { id: '2', text: '🔢 Numara ile Ara', action: 'enter_order_number' },
        ]
      },

      enter_order_number: {
        text: '🔢 Sipariş numaranızı yazın (örn: 12345). Ben sizin için takip edeceğim!',
        type: 'text'
      },

      search_order: {
        text: '🔍 Sipariş numaranızı yazın, size durumunu söyleyeyim.',
        type: 'text'
      },

      create_return: {
        text: '📝 İade talebi oluşturmak için "İade Taleplerim" sayfasına yönlendiriyorum.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📋 İade Taleplerim', action: 'navigate_returns' },
          { id: '2', text: '❓ İade Koşulları', action: 'return_policy' },
        ]
      },

      rate_chat: {
        text: '⭐ Bu sohbeti nasıl değerlendirirsiniz?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⭐⭐⭐⭐⭐ Mükemmel', action: 'rate_5' },
          { id: '2', text: '⭐⭐⭐⭐ İyi', action: 'rate_4' },
          { id: '3', text: '⭐⭐⭐ Orta', action: 'rate_3' },
          { id: '4', text: '⭐⭐ Kötü', action: 'rate_2' },
        ]
      },

      satisfied: {
        text: '✅ Harika! Başka bir konuda yardıma ihtiyacınız olursa her zaman buradayım.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🆕 Yeni Soru', action: 'new_chat' },
          { id: '2', text: '⭐ Değerlendir', action: 'rate_chat' },
        ]
      },

      rate_5: {
        text: '🎉 Harika! 5 yıldız için teşekkür ederim. Sizinle yardımcı olabildiğim için mutluyum!',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🆕 Yeni Soru', action: 'new_chat' },
          { id: '2', text: '🏠 Ana Menü', action: 'greeting' },
        ]
      },

      rate_4: {
        text: '😊 4 yıldız için teşekkürler! Daha iyi hizmet verebilmek için çalışmaya devam ediyoruz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🆕 Yeni Soru', action: 'new_chat' },
          { id: '2', text: '🎧 Geri Bildirim', action: 'feedback' },
        ]
      },

      rate_3: {
        text: '🤔 3 yıldız için teşekkürler. Nasıl daha iyi hizmet verebiliriz?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '💬 Geri Bildirim Ver', action: 'feedback' },
          { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },

      rate_2: {
        text: '😔 Üzgünüm, beklentilerinizi karşılayamadık. Lütfen canlı destekle iletişime geçin.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🎧 Canlı Destek', action: 'live_support' },
          { id: '2', text: '📧 Şikayet Gönder', action: 'complaint' },
        ]
      },

      new_chat: {
        text: '🆕 Yeni bir sohbet başlatalım! Size nasıl yardımcı olabilirim?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
          { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
          { id: '3', text: '❓ S.S.S.', action: 'faq' },
          { id: '4', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },

      payment_methods: {
        text: '💳 Kabul ettiğimiz ödeme yöntemleri:\n\n• 💳 Kredi/Banka Kartı (3D Secure)\n• 🏦 Havale/EFT\n• 📱 Dijital Cüzdanlar\n\nKapıda ödeme bulunmamaktadır. Tüm ödemeleriniz SSL ile korunmaktadır.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📊 Taksit Seçenekleri', action: 'installment_options' },
          { id: '2', text: '🔒 Güvenlik', action: 'payment_security' },
        ]
      },

      installment_options: {
        text: '📊 Taksit seçeneklerimiz:\n\n• 2 Taksit - Komisyonsuz\n• 3 Taksit - %2.9 komisyon\n• 6 Taksit - %3.9 komisyon\n• 9 Taksit - %4.9 komisyon\n• 12 Taksit - %5.9 komisyon\n\n*Oranlar bankanıza göre değişebilir.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '💳 Ödeme Yöntemleri', action: 'payment_methods' },
          { id: '2', text: '🎧 Daha Fazla Bilgi', action: 'live_support' },
        ]
      },

      delivery_times: {
        text: '⏰ Teslimat süreleri:\n\n• 🚚 Standart Kargo: 2-5 iş günü\n• ⚡ Hızlı Kargo: 1-2 iş günü\n• 🏪 Mağazadan Teslim: Aynı gün\n\n📍 Kargo süresi bulunduğunuz ile göre değişir.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '💰 Kargo Ücretleri', action: 'shipping_costs' },
          { id: '2', text: '📦 Sipariş Ver', action: 'view_products' },
        ]
      },

      shipping_costs: {
        text: '💰 Kargo ücretleri:\n\n• 🆓 150 TL üzeri: Ücretsiz\n• 📦 150 TL altı: 19.90 TL\n• ⚡ Hızlı kargo: +15 TL\n• 🏝️ Adalar: +25 TL\n\nÖzel ürünlerde farklı ücretler uygulanabilir.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⏰ Teslimat Süreleri', action: 'delivery_times' },
          { id: '2', text: '🛒 Alışverişe Başla', action: 'view_products' },
        ]
      },

      return_policy: {
        text: '↩️ İade koşulları:\n\n• ⏰ 14 gün içinde iade hakkı\n• 📦 Orijinal ambalajında olmalı\n• 🏷️ Etiketler zarar görmemiş olmalı\n• 🚫 Hijyen ürünleri iade edilemez\n\nHasarlı ürünlerde kargo ücreti bizden!',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📝 İade Talebi', action: 'navigate_returns' },
          { id: '2', text: '🚚 İade Kargo', action: 'return_shipping' },
        ]
      },

      llm_settings: {
        text: '⚙️ AnythingLLM ayarlarını yapılandırmak için ayarlar sayfasına yönlendirileceksiniz. Bu özellik ile chatbot daha akıllı yanıtlar verebilir.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⚙️ Ayarları Aç', action: 'navigate_llm_settings' },
          { id: '2', text: '❓ LLM Nedir?', action: 'llm_info' },
          { id: '3', text: '🏠 Ana Menü', action: 'greeting' },
        ]
      },

      llm_info: {
        text: '🤖 AnythingLLM, chatbot\'a RAG (Retrieval-Augmented Generation) özelliği kazandırır:\n\n✅ Daha akıllı yanıtlar\n✅ Özel dokümanlardan bilgi\n✅ Daha doğal konuşma\n✅ Sürekli öğrenme\n\nKendi LLM sunucunuzu bağlayabilir ve eğittiğiniz modeli kullanabilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⚙️ Ayarları Yap', action: 'navigate_llm_settings' },
          { id: '2', text: '🔗 Daha Fazla Bilgi', action: 'llm_docs' },
          { id: '3', text: '🏠 Ana Menü', action: 'greeting' },
        ]
      },

      more_info: {
        text: '📚 Hangi konuda daha fazla bilgi istiyorsunuz?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📦 Sipariş & Kargo', action: 'shipping' },
          { id: '2', text: '💳 Ödeme & Taksit', action: 'payment' },
          { id: '3', text: '↩️ İade & Değişim', action: 'return' },
          { id: '4', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },
      campaign_info: {
        text: '🎁 Kampanyalar hakkında bilgi almak için “Aktif Kampanyalar”ı seçebilir veya size uygun kampanya olup olmadığını sorgulayabilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🎁 Aktif Kampanyalar', action: 'view_campaigns' },
          { id: '2', text: '✅ Uygun muyum?', action: 'check_campaign_eligibility' },
          { id: '3', text: '🏠 Ana Menü', action: 'greeting' },
        ]
      },
      view_campaigns: await (async () => {
        const resp = await ChatbotService.handleCampaignsLocal();
        return resp;
      })(),
      show_recommendations: await (async () => {
        const resp = await ChatbotService.handleRecommendationsLocal();
        return resp;
      })(),
      check_campaign_eligibility: {
        text: '🔎 Sepetiniz ve geçmişiniz üzerinden uygun kampanyaları kontrol ediyorum... (yakında)',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🎁 Aktif Kampanyalar', action: 'view_campaigns' },
          { id: '2', text: '⭐ Öneriler', action: 'show_recommendations' },
        ]
      },
      // --- Order helpers ---
      order_last_status: {
        text: '📦 Son sipariş durumunuzu kontrol ediyorum...\n\n⚠️ Sipariş detayları için lütfen "Siparişlerim" sayfasına gidin.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📋 Siparişlerim', action: 'navigate_orders' },
          { id: '2', text: '🔢 Numara Gir', action: 'enter_order_number' },
          { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },
      cancel_order: {
        text: 'İptal etmek istediğiniz sipariş numarasını yazın (örn: 12345). İptal sadece “Beklemede” durumundaki siparişlerde mümkündür.',
        type: 'text'
      },
      track_shipment: {
        text: 'Kargo takibi için sipariş detaylarındaki takip numarasını kullanabilirsiniz. Dilerseniz kargo iletişim bilgilerini paylaşabilirim.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📞 Kargo İletişim', action: 'cargo_contact' },
          { id: '2', text: '📋 Siparişlerim', action: 'navigate_orders' },
        ]
      },
      search_faq: {
        text: 'S.S.S. içinde aramak istediğiniz anahtar kelimeyi yazın (örn: kargo ücreti, iade süresi).',
        type: 'text'
      },
    };

    const response = responses[action] || {
      text: '🤖 Bu özellik henüz geliştiriliyor. Canlı destek ile iletişime geçebilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🎧 Canlı Destek', action: 'live_support' },
        { id: '2', text: '🏠 Ana Menü', action: 'greeting' },
      ]
    };

    return {
      id: messageId,
      text: response.text,
      isBot: true,
      timestamp,
      type: response.type || 'text',
      quickReplies: response.quickReplies,
      data: response.data,
      product: response.product,
      order: response.order,
    };
  }

  // Analitik fonksiyonları
  static async logChatInteraction(userId: number, message: string, intent: string, satisfaction?: number) {
    try {
      // Backend'e analitik verilerini gönder
      await apiService.post('/chatbot/analytics', {
        userId,
        message: message.substring(0, 100), // Gizlilik için kısalt
        intent,
        satisfaction,
      });
      
      console.log('✅ Chat analytics logged to backend');
    } catch (error) {
      console.error('❌ Error logging chat interaction:', error);
      // Fallback: Local logging
      console.log('Chat Analytics (local):', {
        userId,
        message: message.substring(0, 100),
        intent,
        timestamp: new Date(),
        satisfaction,
      });
    }
  }

  static async getChatAnalytics() {
    // Mock analytics data
    return {
      totalChats: 1250,
      averageRating: 4.3,
      topIntents: [
        { intent: 'order_tracking', count: 450 },
        { intent: 'product_search', count: 320 },
        { intent: 'support', count: 280 },
      ],
      resolutionRate: 0.85,
    };
  }

  // Yardımcı fonksiyonlar
  private static async getActiveUserId(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem('currentUserId');
      const uid = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(uid) && uid > 0 ? uid : 0;
    } catch {
      return 0;
    }
  }

  private static getOrderStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Beklemede',
      'confirmed': 'Onaylandı',
      'preparing': 'Hazırlanıyor',
      'shipped': 'Kargoda',
      'delivered': 'Teslim Edildi',
      'cancelled': 'İptal Edildi',
      'returned': 'İade Edildi',
    };
    return statusMap[status] || status;
  }

  static async handleNavigation(action: string, navigation: any, data?: any) {
    try {
      // Root-level navigate helper to avoid nested navigator issues
      const tryNavigate = (routeName: string, params?: any) => {
        if (!navigation) return false;
        try {
          // Try current navigator
          navigation.navigate(routeName, params);
          return true;
        } catch (_) {
          // Fallback: try parent navigator
          const parent = navigation.getParent?.();
          if (parent?.navigate) {
            parent.navigate(routeName as never, params as never);
            return true;
          }
          return false;
        }
      };
      switch (action) {
        case 'navigate_orders':
          if (!tryNavigate('Orders')) throw new Error('Navigator not found for Orders');
          break;
        case 'navigate_returns':
          if (!tryNavigate('ReturnRequests')) throw new Error('Navigator not found for ReturnRequests');
          break;
        case 'view_faq':
          if (!tryNavigate('FAQ')) throw new Error('Navigator not found for FAQ');
          break;
        case 'view_products':
          if (data?.query) {
            if (!tryNavigate('ProductList', { searchQuery: data.query })) throw new Error('Navigator not found for ProductList');
          } else {
            if (!tryNavigate('ProductList')) throw new Error('Navigator not found for ProductList');
          }
          break;
        case 'order_detail':
          if (!tryNavigate('OrderDetail', { orderId: data?.orderId })) throw new Error('Navigator not found for OrderDetail');
          break;
        case 'view_categories':
          if (!tryNavigate('ProductList')) throw new Error('Navigator not found for ProductList');
          break;
        case 'search_category_kamp':
          navigation.navigate('ProductList', { category: 'Kamp' });
          break;
        case 'search_category_avcilik':
          navigation.navigate('ProductList', { category: 'Avcılık' });
          break;
        case 'search_category_balik':
          navigation.navigate('ProductList', { category: 'Balıkçılık' });
          break;
        case 'search_category_giyim':
          navigation.navigate('ProductList', { category: 'Giyim' });
          break;
        case 'call_support':
          Linking.openURL('tel:05303125813');
          break;
        case 'whatsapp_support':
          Linking.openURL('https://wa.me/905303125813?text=Merhaba, yardıma ihtiyacım var.');
          break;
        case 'email_support':
          Linking.openURL('mailto:info@hugluoutdoor.com?subject=Destek Talebi');
          break;
        case 'navigate_llm_settings':
          if (!tryNavigate('AnythingLLMSettings')) throw new Error('Navigator not found for AnythingLLMSettings');
          break;
        case 'llm_docs':
          Linking.openURL('https://docs.anythingllm.com/');
          break;
        default:
          console.log('Unknown navigation action:', action);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      throw error;
    }
  }
}
