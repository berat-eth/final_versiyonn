import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import InstagramStoryService, { InstagramStoryItem } from '../services/InstagramStoryService';

interface InstagramStoriesProps {
  onStoryPress?: (story: InstagramStoryItem) => void;
  limit?: number;
  username?: string;
}

export const InstagramStories: React.FC<InstagramStoriesProps> = ({ onStoryPress, limit = 20, username = 'hugluoutdoor' }) => {
  const [stories, setStories] = useState<InstagramStoryItem[]>([]);

  const load = useCallback(async () => {
    const data = await InstagramStoryService.getStories(limit, username);
    setStories(data || []);
  }, [limit, username]);

  useEffect(() => {
    load();
  }, [load]);

  if (!stories || stories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {stories.map((item) => (
          <TouchableOpacity key={String(item.id)} style={styles.item} onPress={() => onStoryPress?.(item)}>
            <View style={[styles.ring, item.hasUnseen ? styles.ringUnseen : styles.ringSeen]}>
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            </View>
            <Text style={styles.username} numberOfLines={1}>
              {item.username || item.fullName || 'story'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
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


