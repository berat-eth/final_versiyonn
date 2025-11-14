import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { LiveSupportService, LiveSupportMessage } from '../services/LiveSupportService';
import { UserController } from '../controllers/UserController';

interface LiveSupportScreenProps {
  navigation: any;
}

export const LiveSupportScreen: React.FC<LiveSupportScreenProps> = ({ navigation }) => {
  const [messages, setMessages] = useState<LiveSupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<number | null>(null);

  useEffect(() => {
    initializeChat();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      const currentUserId = await UserController.getCurrentUserId();
      
      if (!currentUserId || currentUserId <= 0) {
        Alert.alert(
          'Giriş Gerekli',
          'Canlı destek kullanmak için lütfen giriş yapın.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack()
            }
          ]
        );
        return;
      }

      setUserId(currentUserId);

      // Mesaj geçmişini yükle
      const history = await LiveSupportService.getMessageHistory(currentUserId);
      setMessages(history);

      // Son mesaj ID'sini kaydet
      if (history.length > 0) {
        const adminMessages = history.filter(m => m.sender === 'admin');
        if (adminMessages.length > 0) {
          lastMessageIdRef.current = Math.max(...adminMessages.map(m => m.id));
        }
      }

      // Polling başlat
      startPolling(currentUserId);
    } catch (error) {
      console.error('❌ Chat başlatma hatası:', error);
      Alert.alert('Hata', 'Chat başlatılamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = (currentUserId: number) => {
    // Her 5 saniyede bir admin mesajlarını kontrol et
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const newMessages = await LiveSupportService.getAdminMessages(
          currentUserId,
          lastMessageIdRef.current || undefined
        );

        if (newMessages.length > 0) {
          setMessages(prev => {
            // Yeni mesajları ekle (duplicate kontrolü)
            const existingIds = new Set(prev.map(m => m.id));
            const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
            
            if (uniqueNewMessages.length > 0) {
              // Son mesaj ID'sini güncelle
              lastMessageIdRef.current = Math.max(...uniqueNewMessages.map(m => m.id));
              
              // Mesajları okundu olarak işaretle
              uniqueNewMessages.forEach(msg => {
                LiveSupportService.markMessageAsRead(msg.id).catch(() => {});
              });

              return [...prev, ...uniqueNewMessages];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('❌ Polling hatası:', error);
      }
    }, 5000); // 5 saniye
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    // Optimistic update - mesajı hemen göster
    const tempMessage: LiveSupportMessage = {
      id: Date.now(), // Geçici ID
      message: messageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await LiveSupportService.sendMessage(messageText);

      if (!response.success) {
        // Hata durumunda geçici mesajı kaldır
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        Alert.alert('Hata', response.message || 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      } else if (response.data) {
        // Gerçek mesajı güncelle
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id ? response.data! : m
        ));
      }
    } catch (error: any) {
      // Hata durumunda geçici mesajı kaldır
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      Alert.alert('Hata', 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = (message: LiveSupportMessage, index: number) => {
    const isUser = message.sender === 'user';
    const messageDate = new Date(message.timestamp);
    const timeString = messageDate.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <View
        key={`${message.id}-${index}`}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.adminMessageContainer
        ]}
      >
        {!isUser && (
          <View style={styles.adminAvatar}>
            <Icon name="support-agent" size={20} color={Colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.adminBubble
          ]}
        >
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.adminMessageText
          ]}>
            {message.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isUser ? styles.userMessageTime : styles.adminMessageTime
          ]}>
            {timeString}
          </Text>
        </View>
        {isUser && (
          <View style={styles.userAvatar}>
            <Icon name="person" size={20} color={Colors.textOnPrimary} />
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Canlı Destek</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Canlı Destek</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Çevrimiçi</Text>
          </View>
        </View>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="chat-bubble-outline" size={64} color={Colors.textLight} />
              <Text style={styles.emptyText}>Henüz mesaj yok</Text>
              <Text style={styles.emptySubtext}>
                Sorunuzu yazın, size yardımcı olalım
              </Text>
            </View>
          ) : (
            messages.map((message, index) => renderMessage(message, index))
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor={Colors.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.textOnPrimary} />
            ) : (
              <Icon name="send" size={20} color={Colors.textOnPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.textLight,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  adminMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: Spacing.md,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: Colors.textOnPrimary,
  },
  adminMessageText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  userMessageTime: {
    color: Colors.textOnPrimary + 'CC',
  },
  adminMessageTime: {
    color: Colors.textLight,
  },
  adminAvatar: {
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
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
    maxHeight: 100,
    marginRight: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
});

