import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import AdminStoryService, { AdminStoryItem } from '../services/AdminStoryService';
import StoryViewer from './StoryViewer';

interface InstagramStoriesProps {
  onStoryPress?: (story: AdminStoryItem) => void;
  limit?: number;
}

export const InstagramStories: React.FC<InstagramStoriesProps> = ({ onStoryPress, limit = 20 }) => {
  const [stories, setStories] = useState<AdminStoryItem[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  const load = useCallback(async () => {
    console.log('Story yükleniyor...');
    const data = await AdminStoryService.getStories(limit);
    console.log('Story verisi:', data);
    
    // Eğer API'den veri gelmezse mock data kullan
    if (!data || data.length === 0) {
      const mockStories = [
        {
          id: 1,
          title: 'Yeni Koleksiyon',
          description: 'Huğlu Outdoor yeni koleksiyonu keşfedin. Doğa sporları için özel tasarım ürünlerimizi inceleyin.',
          imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=600&fit=crop',
          thumbnailUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop',
          isActive: true,
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 saat sonra
          clickAction: { type: 'category', value: 'yeni-koleksiyon' }
        },
        {
          id: 2,
          title: 'Kamp Ürünleri',
          description: 'Kamp için gerekli tüm ekipmanlar. Çadır, uyku tulumu, mat ve daha fazlası. Doğada konforlu bir deneyim için.',
          imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop',
          thumbnailUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=100&h=100&fit=crop',
          isActive: true,
          order: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 saat sonra
          clickAction: { type: 'category', value: 'kamp-urunleri' }
        },
        {
          id: 3,
          title: 'Özel İndirim',
          description: 'Sadece bugün geçerli %30 indirim! Tüm outdoor ürünlerinde büyük fırsat. Kaçırma!',
          imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=600&fit=crop',
          thumbnailUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=100&h=100&fit=crop',
          isActive: true,
          order: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 saat sonra
          clickAction: { type: 'url', value: 'https://hugluoutdoor.com/indirim' }
        },
        {
          id: 4,
          title: 'Outdoor Giyim',
          description: 'Doğa sporları için özel tasarım giyim ürünleri. Su geçirmez, nefes alabilir kumaşlar.',
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-14b1e0d35b49?w=400&h=600&fit=crop',
          thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-14b1e0d35b49?w=100&h=100&fit=crop',
          isActive: true,
          order: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 saat sonra
          clickAction: { type: 'category', value: 'outdoor-giyim' }
        },
        {
          id: 5,
          title: 'Trekking Ekipmanları',
          description: 'Uzun yürüyüşler için profesyonel ekipman. Sırt çantası, bot, kıyafet ve aksesuarlar.',
          imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop',
          thumbnailUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=100&h=100&fit=crop',
          isActive: true,
          order: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 saat sonra
          clickAction: { type: 'category', value: 'trekking-ekipmanlari' }
        }
      ];
      console.log('Mock story verisi kullanılıyor:', mockStories);
      setStories(mockStories);
    } else {
      setStories(data);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStoryPress = (story: AdminStoryItem, index: number) => {
    setSelectedStoryIndex(index);
    setViewerVisible(true);
    onStoryPress?.(story);
  };

  if (!stories || stories.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {stories.map((item, index) => (
            <TouchableOpacity 
              key={String(item.id)} 
              style={styles.item} 
              onPress={() => handleStoryPress(item, index)}
            >
              <View style={[styles.ring, styles.ringUnseen]}>
                <Image 
                  source={{ uri: item.thumbnailUrl || item.imageUrl }} 
                  style={styles.avatar} 
                />
              </View>
              <Text style={styles.username} numberOfLines={1}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <StoryViewer
        visible={viewerVisible}
        stories={stories}
        currentIndex={selectedStoryIndex}
        onClose={() => setViewerVisible(false)}
        onStoryPress={onStoryPress}
      />
    </>
  );
};

const AVATAR = 58;
const RING = 68;

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  item: {
    alignItems: 'center',
    marginRight: Spacing.md,
    width: 76,
  },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    ...Shadows.small,
  },
  ringUnseen: {
    borderWidth: 2,
    borderColor: Colors.pink,
  },
  ringSeen: {
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  username: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
});

export default InstagramStories;


