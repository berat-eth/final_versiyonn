import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Modal,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ChatbotService } from '../services/ChatbotService';
import { AnythingLLMService } from '../services/AnythingLLMService';
import { UserController } from '../controllers/UserController';
import { VoiceService } from '../services/VoiceService';
import { VoiceCommandService } from '../services/VoiceCommandService';
import { ChatProductCard } from './ChatProductCard';
import { ChatOrderCard } from './ChatOrderCard';
import { Product } from '../utils/types';
import { Order } from '../utils/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../utils/api-service';

interface ChatbotProps {
  navigation?: any;
  onClose?: () => void;
  productId?: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  type?: 'text' | 'quick_reply' | 'product' | 'order' | 'image' | 'product_card' | 'order_card' | 'voice';
  data?: any;
  quickReplies?: QuickReply[];
  imageUrl?: string;
  voiceUrl?: string;
  product?: Product;
  order?: Order;
}

export interface QuickReply {
  id: string;
  text: string;
  action: string;
  data?: any;
}

const { width, height } = Dimensions.get('window');

export const Chatbot: React.FC<ChatbotProps> = ({ navigation, onClose, productId }) => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Tab bar yüksekliği (70) + safe area bottom + margin
  const bottomOffset = 70 + Math.max(insets.bottom, 8) + 20;
  
  // Typing indicator için animated values'ları component seviyesinde tanımla
  const typingDotOpacity = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3)
  ]).current;

  useEffect(() => {
    loadChatHistory();
    initializeBot();
    startPulseAnimation();
    checkOnlineStatus();
    checkLLMStatus();
    
    // Chatbot butonunu görünür yap
    console.log('✅ Chatbot component mounted');
  }, []);

  const checkLLMStatus = async () => {
    try {
      const config = await AnythingLLMService.getConfig();
      setLlmEnabled(config?.enabled || false);
    } catch (error) {
      console.error('LLM status check error:', error);
      setLlmEnabled(false);
    }
  };

  // Admin mesaj dinleyicisi
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;
    const processedMessageIds = new Set<string>();
    
    const checkMessages = async () => {
      try {
        const userId = await UserController.getCurrentUserId();
        if (!userId || userId <= 0) return;

        const apiService = (await import('../utils/api-service')).default;
        const response = await apiService.get(`/chatbot/admin-messages/${userId}`);
        
        if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
          setMessages(prevMessages => {
            const newMessages = response.data.filter((msg: any) => {
              if (!msg || !msg.id) return false;
              const msgId = `admin-${msg.id}`;
              // Daha önce işlenmemiş mesajları filtrele
              if (processedMessageIds.has(msgId)) return false;
              if (prevMessages.some(m => m.id === msgId)) {
                processedMessageIds.add(msgId);
                return false;
              }
              return true;
            });

            if (newMessages.length > 0) {
              const adminMessages: ChatMessage[] = newMessages.map((msg: any) => {
                const msgId = `admin-${msg.id}`;
                processedMessageIds.add(msgId);
                return {
                  id: msgId,
                  text: msg.message || 'Mesaj içeriği yok',
                  isBot: true,
                  timestamp: new Date(msg.timestamp || Date.now()),
                  type: 'text' as const,
                };
              });

              // Mesajları okundu olarak işaretle (hata durumunda sessizce geç)
              newMessages.forEach((msg: any) => {
                if (msg.id) {
                  apiService.post(`/chatbot/admin-messages/${msg.id}/read`, {}).catch(() => {});
                }
              });

              return [...prevMessages, ...adminMessages];
            }
            return prevMessages;
          });
        }
      } catch (error) {
        // Sessizce geç
      }
    };

    // İlk kontrol (biraz gecikmeyle)
    timeout = setTimeout(checkMessages, 2000);

    // Her 5 saniyede bir kontrol et
    interval = setInterval(checkMessages, 5000);

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  // LLM durumunu yenile (ayarlar sayfasından dönüşte)
  useEffect(() => {
    const focusHandler = () => {
      checkLLMStatus();
    };

    // Navigation focus event listener (eğer navigation prop'u varsa)
    if (navigation?.addListener) {
      const unsubscribe = navigation.addListener('focus', focusHandler);
      return unsubscribe;
    }
  }, [navigation]);

  const checkOnlineStatus = () => {
    // Basit online/offline kontrolü
    const currentHour = new Date().getHours();
    const isWorkingHours = currentHour >= 9 && currentHour <= 18;
    setIsOnline(isWorkingHours);
    
    // Her 5 dakikada bir kontrol et
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      const workingHours = hour >= 9 && hour <= 18;
      setIsOnline(workingHours);
    }, 300000); // 5 dakika

    return () => clearInterval(interval);
  };

  useEffect(() => {
    if (isVisible) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [messages, isVisible]);

  // Typing animasyon kontrolü
  useEffect(() => {
    if (isTyping) {
      const animations = typingDotOpacity.map((opacity, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        )
      );
      
      Animated.parallel(animations).start();
      
      return () => {
        // Animasyonları durdur
        animations.forEach(animation => animation.stop());
      };
    }
  }, [isTyping, typingDotOpacity]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadChatHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('chatHistory');
      if (history) {
        const parsedHistory = JSON.parse(history);
        setMessages(parsedHistory.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatHistory = async (newMessages: ChatMessage[]) => {
    try {
      // Sadece son 50 mesajı kaydet (performans için)
      const limitedMessages = newMessages.slice(-50);
      await AsyncStorage.setItem('chatHistory', JSON.stringify(limitedMessages));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const initializeBot = () => {
    const welcomeMessage: ChatMessage = {
      id: `bot-welcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: '👋 Merhaba! Size nasıl yardımcı olabilirim?',
      isBot: true,
      timestamp: new Date(),
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
        { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
        { id: '3', text: '❓ S.S.S.', action: 'faq' },
        { id: '4', text: '🎧 Canlı Destek', action: 'live_support' },
      ]
    };

    setMessages(prev => {
      if (prev.length === 0) {
        return [welcomeMessage];
      }
      return prev;
    });
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addMessage = (message: ChatMessage) => {
    // Unique ID garantisi için timestamp + random number
    const uniqueMessage = {
      ...message,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setMessages(prev => {
      const newMessages = [...prev, uniqueMessage];
      saveChatHistory(newMessages);
      return newMessages;
    });

    if (!isVisible && uniqueMessage.isBot) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const deleteMessage = (messageId: string) => {
    Alert.alert(
      'Mesajı Sil',
      'Bu mesajı silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            setMessages(prev => {
              const newMessages = prev.filter(msg => msg.id !== messageId);
              saveChatHistory(newMessages);
              return newMessages;
            });
            setSelectedMessageId(null);
          },
        },
      ]
    );
  };

  const clearAllMessages = () => {
    Alert.alert(
      'Tüm Mesajları Sil',
      'Tüm sohbet geçmişini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Tümünü Sil',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            saveChatHistory([]);
            setSelectedMessageId(null);
            // Bot'u yeniden başlat
            setTimeout(() => {
              initializeBot();
            }, 100);
          },
        },
      ]
    );
  };

  // Görsel gönderme
  const pickAndSendImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Görsel seçmek için galeri erişim izni gereklidir.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await uploadAndSendImage(imageUri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Hata', 'Görsel seçilirken bir hata oluştu.');
    }
  };

  // Görsel yükleme ve gönderme
  const uploadAndSendImage = async (imageUri: string) => {
    try {
      setIsTyping(true);

      const formData = new FormData();
      const filename = imageUri.split('/').pop() || `image-${Date.now()}.jpg`;
      
      formData.append('media', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      } as any);

      const baseUrl = apiService.getCurrentApiUrl();
      const response = await fetch(`${baseUrl}/reviews/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const imageUrl = result.data[0].mediaUrl;
        
        const imageMessage: ChatMessage = {
          id: `user-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: '📷 Görsel gönderildi',
          isBot: false,
          timestamp: new Date(),
          type: 'image',
          imageUrl,
        };

        addMessage(imageMessage);
        setIsTyping(false);

        // Bot yanıtı
        setTimeout(() => {
          const botResponse: ChatMessage = {
            id: `bot-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: 'Görselinizi aldım! Size nasıl yardımcı olabilirim?',
            isBot: true,
            timestamp: new Date(),
            type: 'quick_reply',
            quickReplies: [
              { id: '1', text: '📦 Ürün Sorgula', action: 'product_search' },
              { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
            ],
          };
          addMessage(botResponse);
        }, 1000);
      } else {
        throw new Error(result.message || 'Görsel yüklenemedi');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      setIsTyping(false);
      Alert.alert('Hata', 'Görsel yüklenirken bir hata oluştu.');
    }
  };

  // Sesli mesaj kaydetme
  const startVoiceRecording = async () => {
    try {
      await VoiceService.startRecording();
      setIsRecording(true);
    } catch (error: any) {
      console.error('Start recording error:', error);
      Alert.alert('Hata', error.message || 'Ses kaydı başlatılamadı.');
    }
  };

  // Sesli mesaj gönderme
  const stopAndSendVoice = async () => {
    try {
      const uri = await VoiceService.stopRecording();
      setIsRecording(false);

      if (uri) {
        setRecordingUri(uri);
        
        // Ses dosyasını yükle ve gönder
        const formData = new FormData();
        const filename = uri.split('/').pop() || `voice-${Date.now()}.m4a`;
        
        formData.append('media', {
          uri,
          type: 'audio/m4a',
          name: filename,
        } as any);

        const baseUrl = apiService.getCurrentApiUrl();
        const response = await fetch(`${baseUrl}/reviews/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
          const voiceUrl = result.data[0].mediaUrl;
          
          const voiceMessage: ChatMessage = {
            id: `user-voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: '🎤 Sesli mesaj',
            isBot: false,
            timestamp: new Date(),
            type: 'voice',
            voiceUrl,
          };

          addMessage(voiceMessage);
        }
      }
    } catch (error: any) {
      console.error('Stop recording error:', error);
      setIsRecording(false);
      Alert.alert('Hata', 'Ses kaydı gönderilemedi.');
    }
  };

  // Sesli mesaj iptal
  const cancelVoiceRecording = async () => {
    try {
      await VoiceService.cancelRecording();
      setIsRecording(false);
      setRecordingUri(null);
    } catch (error) {
      console.error('Cancel recording error:', error);
    }
  };

  // Sesli mesaj oynatma
  const playVoiceMessage = async (voiceUrl: string) => {
    try {
      if (isPlayingVoice) {
        await VoiceService.stopAudio();
        setIsPlayingVoice(false);
        return;
      }

      setIsPlayingVoice(true);
      await VoiceService.playAudio(voiceUrl);
      setIsPlayingVoice(false);
    } catch (error) {
      console.error('Play voice error:', error);
      setIsPlayingVoice(false);
      Alert.alert('Hata', 'Sesli mesaj oynatılamadı.');
    }
  };

  // Mesaj formatlama (basit markdown ve link detection)
  const formatMessageText = (text: string): React.ReactNode => {
    // Link detection
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
      <Text>
        {parts.map((part, index) => {
          if (urlRegex.test(part)) {
            return (
              <Text
                key={index}
                style={styles.linkText}
                onPress={() => Linking.openURL(part)}
              >
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  const sendMessage = async (text: string, type: string = 'text') => {
    if (!text.trim() && type === 'text') return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text,
      isBot: false,
      timestamp: new Date(),
      type: type as any,
    };

    addMessage(userMessage);
    setInputText('');
    setIsTyping(true);

    try {
      // Kullanıcı ID'sini al
      const userId = await UserController.getCurrentUserId();
      
      // AI ile mesaj işleme (productId ve userId ile)
      const response = await ChatbotService.processMessage(text, type, productId, userId);
      
      // Intent tespiti (analitik için)
      const intent = detectIntent(text.toLowerCase());
      
      // Analitik takip (gerçek userId ile) - hata durumunda sessizce geç
      ChatbotService.logChatInteraction(userId || 0, text, intent).catch(() => {});
      
      // Yanıtı göster (gerçekçi yazma süresi)
      const typingDelay = 1000 + Math.random() * 1000;
      setTimeout(() => {
        setIsTyping(false);
        if (response && response.text) {
          // Ürün veya sipariş kartı varsa data'yı ekle
          if (response.type === 'product_card' && response.data?.product) {
            const cardMessage: ChatMessage = {
              ...response,
              product: response.data.product,
            };
            addMessage(cardMessage);
          } else if (response.type === 'order_card' && response.data?.order) {
            const cardMessage: ChatMessage = {
              ...response,
              order: response.data.order,
            };
            addMessage(cardMessage);
          } else {
            addMessage(response);
          }
        } else {
          // Fallback: Yanıt alınamadı
          const fallbackMessage: ChatMessage = {
            id: `bot-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: '🤔 Yanıt alınamadı. Lütfen tekrar deneyin.',
            isBot: true,
            timestamp: new Date(),
            type: 'quick_reply',
            quickReplies: [
              { id: '1', text: '🔄 Tekrar Dene', action: 'retry' },
              { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
            ]
          };
          addMessage(fallbackMessage);
        }
      }, typingDelay);

    } catch (error: any) {
      console.error('❌ Chatbot send message error:', error);
      setIsTyping(false);
      
      // Hata mesajı oluştur
      const errorMessage: ChatMessage = {
        id: `bot-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: error?.message?.includes('network') || error?.message?.includes('timeout') 
          ? '🌐 İnternet bağlantınızı kontrol edin ve tekrar deneyin.'
          : '😔 Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin veya canlı desteğe bağlanın.',
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🔄 Tekrar Dene', action: 'retry' },
          { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      };
      addMessage(errorMessage);
    }
  };

  // Basit intent tespiti (analitik için)
  const detectIntent = (message: string): string => {
    const intents = {
      greeting: ['merhaba', 'selam', 'hey', 'hi', 'hello', 'iyi günler', 'günaydın', 'iyi akşamlar'],
      order_tracking: ['sipariş', 'takip', 'nerede', 'kargo', 'teslimat', 'sipariş takibi', 'siparişim'],
      product_search: ['ürün', 'arama', 'bul', 'var mı', 'stok', 'fiyat', 'ürün arama'],
      campaigns: ['kampanya', 'indirim', 'kupon', 'çek', 'promosyon', 'fırsat', 'özel teklif'],
      support: ['yardım', 'destek', 'problem', 'sorun', 'şikayet', 'canlı destek'],
      payment: ['ödeme', 'para', 'kredi kartı', 'banka', 'ücret', 'fatura', 'taksit'],
      return: ['iade', 'değişim', 'geri', 'kusur', 'hasarlı', 'yanlış'],
      shipping: ['kargo', 'teslimat', 'gönderim', 'ulaştırma', 'adres'],
      account: ['hesap', 'profil', 'şifre', 'giriş', 'kayıt', 'üyelik'],
      goodbye: ['görüşürüz', 'hoşça kal', 'bye', 'teşekkür', 'sağ ol', 'kapanış']
    };

    // Sipariş numarası tespiti
    if (/\b\d{5,}\b/.test(message)) {
      return 'order_number';
    }

    // Intent tespiti
    for (const [intent, keywords] of Object.entries(intents)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          return intent;
        }
      }
    }

    // Ürün arama tespiti
    if (message.length > 3) {
      return 'product_search_query';
    }

    return 'unknown';
  };

  const handleQuickReply = async (quickReply: QuickReply) => {
    // Retry action - son mesajı tekrar gönder
    if (quickReply.action === 'retry') {
      const lastUserMessage = messages.filter(m => !m.isBot).pop();
      if (lastUserMessage) {
        await sendMessage(lastUserMessage.text, lastUserMessage.type || 'text');
      }
      return;
    }

    // Canlı destek action'ı - LiveSupportScreen'e yönlendir
    if (quickReply.action === 'live_support') {
      if (navigation) {
        navigation.navigate('LiveSupport');
        // Chatbot'u kapat
        toggleChatbot();
      } else {
        // Navigation yoksa mesaj gönder
        await sendMessage('Canlı destek istiyorum', 'live_support');
      }
      return;
    }

    // Navigasyon eylemi kontrolü
    if (quickReply.action.includes('navigate_') || 
        quickReply.action.includes('view_') || 
        quickReply.action === 'order_detail') {
      
      if (navigation) {
        try {
          await ChatbotService.handleNavigation(quickReply.action, navigation, quickReply.data);
          
          // Chatbot'u kapat
          toggleChatbot();
          
          // Başarı mesajı ekle
          const successMessage: ChatMessage = {
            id: `bot-success-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: `✅ ${quickReply.text} sayfasına yönlendiriliyorsunuz...`,
            isBot: true,
            timestamp: new Date(),
            type: 'text',
          };
          addMessage(successMessage);
        } catch (navError: any) {
          console.error('Navigation error:', navError);
          const errorMessage: ChatMessage = {
            id: `bot-nav-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: '⚠️ Sayfaya yönlendirilemedi. Lütfen manuel olarak gidin.',
            isBot: true,
            timestamp: new Date(),
            type: 'text',
          };
          addMessage(errorMessage);
        }
        return;
      }
    }

    await sendMessage(quickReply.text, quickReply.action);
  };

  const toggleChatbot = () => {
    setIsVisible(!isVisible);
    if (!isVisible) {
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(animatedValue, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
    Animated.timing(animatedValue, {
      toValue: 0.3,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const maximizeChat = () => {
    setIsMinimized(false);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const renderMessage = (message: ChatMessage) => {
    const isBot = message.isBot;
    const isSelected = selectedMessageId === message.id;
    
    // Görsel mesaj
    if (message.type === 'image' && message.imageUrl) {
      return (
        <TouchableOpacity
          style={[
            styles.messageContainer,
            isBot ? styles.botMessageContainer : styles.userMessageContainer,
          ]}
          onLongPress={() => setSelectedMessageId(isSelected ? null : message.id)}
          activeOpacity={0.7}
          key={message.id}
          onPress={() => {
            setViewingImage(message.imageUrl || null);
            setImageViewerVisible(true);
          }}
        >
          {isBot && (
            <View style={styles.botAvatar}>
              <Icon name="smart-toy" size={20} color={Colors.primary} />
            </View>
          )}
          <View style={[styles.messageBubble, isBot ? styles.botBubble : styles.userBubble]}>
            <Image
              source={{ uri: message.imageUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
            {message.text && (
              <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>
                {message.text}
              </Text>
            )}
          </View>
          {!isBot && (
            <View style={styles.userAvatar}>
              <Icon name="person" size={20} color={Colors.textOnPrimary} />
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // Sesli mesaj
    if (message.type === 'voice' && message.voiceUrl) {
      return (
        <TouchableOpacity
          style={[
            styles.messageContainer,
            isBot ? styles.botMessageContainer : styles.userMessageContainer,
          ]}
          onLongPress={() => setSelectedMessageId(isSelected ? null : message.id)}
          activeOpacity={0.7}
          key={message.id}
        >
          {isBot && (
            <View style={styles.botAvatar}>
              <Icon name="smart-toy" size={20} color={Colors.primary} />
            </View>
          )}
          <View style={[styles.messageBubble, isBot ? styles.botBubble : styles.userBubble]}>
            <TouchableOpacity
              style={styles.voiceMessageContainer}
              onPress={() => playVoiceMessage(message.voiceUrl!)}
            >
              <Icon
                name={isPlayingVoice ? 'pause' : 'play-arrow'}
                size={24}
                color={isBot ? Colors.primary : Colors.textOnPrimary}
              />
              <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>
                {message.text || '🎤 Sesli mesaj'}
              </Text>
            </TouchableOpacity>
          </View>
          {!isBot && (
            <View style={styles.userAvatar}>
              <Icon name="person" size={20} color={Colors.textOnPrimary} />
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // Ürün kartı
    if (message.type === 'product_card' && message.product) {
      return (
        <View
          style={[
            styles.messageContainer,
            styles.botMessageContainer,
          ]}
          key={message.id}
        >
          <View style={styles.botAvatar}>
            <Icon name="smart-toy" size={20} color={Colors.primary} />
          </View>
          <View style={styles.cardContainer}>
            <ChatProductCard
              product={message.product}
              onPress={(product) => {
                if (navigation) {
                  navigation.navigate('ProductDetail', { productId: product.id });
                  toggleChatbot();
                }
              }}
            />
          </View>
        </View>
      );
    }

    // Sipariş kartı
    if (message.type === 'order_card' && message.order) {
      return (
        <View
          style={[
            styles.messageContainer,
            styles.botMessageContainer,
          ]}
          key={message.id}
        >
          <View style={styles.botAvatar}>
            <Icon name="smart-toy" size={20} color={Colors.primary} />
          </View>
          <View style={styles.cardContainer}>
            <ChatOrderCard
              order={message.order}
              onPress={(order) => {
                if (navigation) {
                  navigation.navigate('OrderDetail', { orderId: order.id });
                  toggleChatbot();
                }
              }}
            />
          </View>
        </View>
      );
    }
    
    // Normal metin mesajı
    return (
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isBot ? styles.botMessageContainer : styles.userMessageContainer,
          isSelected && styles.selectedMessageContainer
        ]}
        onLongPress={() => setSelectedMessageId(isSelected ? null : message.id)}
        activeOpacity={0.7}
        key={message.id}
      >
        {isBot && (
          <View style={styles.botAvatar}>
            <Icon name="smart-toy" size={20} color={Colors.primary} />
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isBot ? styles.botBubble : styles.userBubble,
          isSelected && styles.selectedBubble
        ]}>
          <Text style={[
            styles.messageText,
            isBot ? styles.botText : styles.userText
          ]}>
            {formatMessageText(message.text)}
          </Text>
          
          {message.quickReplies && (
            <View style={styles.quickRepliesContainer}>
              {message.quickReplies.map((reply) => (
                <TouchableOpacity
                  key={reply.id}
                  style={styles.quickReplyButton}
                  onPress={() => handleQuickReply(reply)}
                >
                  <Text style={styles.quickReplyText}>{reply.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Delete button overlay */}
          {isSelected && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteMessage(message.id)}
            >
              <Icon name="delete" size={16} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
        
        {!isBot && (
          <View style={styles.userAvatar}>
            <Icon name="person" size={20} color={Colors.textOnPrimary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };


  const renderTypingIndicator = () => {
    return (
      <View style={[styles.messageContainer, styles.botMessageContainer]}>
        <View style={styles.botAvatar}>
          <Icon name="smart-toy" size={20} color={Colors.primary} />
        </View>
        <View style={[styles.messageBubble, styles.botBubble]}>
          <View style={styles.typingIndicator}>
            {typingDotOpacity.map((opacity, index) => (
              <Animated.View
                key={`typing-dot-${index}`}
                style={[styles.typingDot, { opacity }]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderFloatingButton = () => (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <Animated.View style={[
        styles.floatingButton,
        { transform: [{ scale: pulseAnim }] }
      ]}>
        <TouchableOpacity
          style={styles.floatingButtonInner}
          onPress={toggleChatbot}
          activeOpacity={0.8}
        >
          <Icon name="chat" size={24} color={Colors.textOnPrimary} />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderChatWindow = () => (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <Animated.View style={[
        styles.chatWindow,
        isMinimized && styles.minimizedChat,
        {
          transform: [{
            scale: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            })
          }],
          opacity: animatedValue,
        }
      ]}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.botAvatarLarge}>
            <Icon name="smart-toy" size={24} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.botName}>Huglu Asistan</Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusDot,
                { backgroundColor: isOnline ? Colors.success : Colors.error }
              ]} />
              <Text style={styles.statusText}>
                {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
              </Text>
              {llmEnabled && (
                <View style={styles.llmBadge}>
                  <Text style={styles.llmBadgeText}>AI</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          {!isMinimized && messages.length > 0 && (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={clearAllMessages}
            >
              <Icon name="delete-sweep" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={isMinimized ? maximizeChat : minimizeChat}
          >
            <Icon 
              name={isMinimized ? "expand-more" : "expand-less"} 
              size={20} 
              color={Colors.textLight} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={toggleChatbot}
          >
            <Icon name="close" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          >
            {messages.map((message) => (
              <View key={message.id}>
                {renderMessage(message)}
              </View>
            ))}
            {isTyping && renderTypingIndicator()}
          </ScrollView>

          {/* Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inputContainer}
          >
            <View style={styles.inputRow}>
              {!isRecording ? (
                <>
                  <TouchableOpacity 
                    style={styles.attachButton}
                    onPress={pickAndSendImage}
                  >
                    <Icon name="image" size={20} color={Colors.textLight} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.attachButton}
                    onPress={startVoiceRecording}
                  >
                    <Icon name="mic" size={20} color={Colors.textLight} />
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.textInput}
                    placeholder="Mesajınızı yazın..."
                    placeholderTextColor={Colors.textLight}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                  />
                  
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      inputText.trim() ? styles.sendButtonActive : styles.sendButtonInactive
                    ]}
                    onPress={() => sendMessage(inputText)}
                    disabled={!inputText.trim()}
                  >
                    <Icon 
                      name="send" 
                      size={20} 
                      color={inputText.trim() ? Colors.textOnPrimary : Colors.textLight} 
                    />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.recordingContainer}>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>Kayıt yapılıyor...</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stopButton}
                    onPress={stopAndSendVoice}
                  >
                    <Icon name="stop" size={20} color={Colors.textOnPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={cancelVoiceRecording}
                  >
                    <Icon name="close" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </>
      )}
      </Animated.View>
    </View>
  );

  return (
    <>
      {!isVisible && renderFloatingButton()}
      {isVisible && renderChatWindow()}
      
      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setImageViewerVisible(false)}
          >
            <Icon name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          {viewingImage && (
            <Image
              source={{ uri: viewingImage }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 25,
      },
    }),
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    ...Shadows.large,
  },
  floatingButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  chatWindow: {
    width: width * 0.9,
    maxWidth: 350,
    height: height * 0.7,
    maxHeight: 500,
    backgroundColor: Colors.background,
    borderRadius: 16,
    ...Shadows.large,
    overflow: 'hidden',
  },
  minimizedChat: {
    height: 60,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  botName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  llmBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  llmBadgeText: {
    fontSize: 10,
    color: Colors.textOnPrimary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  messagesContainer: {
    flex: 1,
    padding: Spacing.sm,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: Spacing.sm,
    borderRadius: 16,
  },
  botBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  botText: {
    color: Colors.text,
  },
  userText: {
    color: Colors.textOnPrimary,
  },
  quickRepliesContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  quickReplyButton: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  quickReplyText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textLight,
    marginRight: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  attachButton: {
    padding: Spacing.xs,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: Colors.border,
  },
  selectedMessageContainer: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    margin: 2,
  },
  selectedBubble: {
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.error + '30',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardContainer: {
    marginVertical: Spacing.xs,
  },
  linkText: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: Spacing.sm,
  },
  imageViewerImage: {
    width: width * 0.9,
    height: height * 0.7,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    backgroundColor: Colors.error + '20',
    borderRadius: 20,
    flex: 1,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.error,
  },
  recordingText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
});
