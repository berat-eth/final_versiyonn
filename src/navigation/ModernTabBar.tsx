import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';

const { width } = Dimensions.get('window');

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const tabIcons: { [key: string]: string } = {
  Home: 'home',
  Products: 'category',
  Cart: 'shopping-cart',
  Profile: 'person',
  Custom: 'business',
};

export const ModernTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;
          const iconName = tabIcons[route.name] || 'apps';
          const activeColor = options.tabBarActiveTintColor || Colors.primary;
          const inactiveColor = options.tabBarInactiveTintColor || Colors.textLight;
          const iconNode = typeof options.tabBarIcon === 'function'
            ? options.tabBarIcon({ color: isFocused ? activeColor : inactiveColor, size: 26 })
            : (
                <Icon
                  name={iconName}
                  size={26}
                  color={isFocused ? activeColor : inactiveColor}
                />
              );

          // Animations
          const scale = useRef(new Animated.Value(isFocused ? 1.1 : 1)).current;
          const opacity = useRef(new Animated.Value(isFocused ? 1 : 0.7)).current;
          const translateY = useRef(new Animated.Value(isFocused ? -2 : 0)).current;

          useEffect(() => {
            Animated.parallel([
              Animated.spring(scale, { toValue: isFocused ? 1.12 : 1, useNativeDriver: true, friction: 6, tension: 120 }),
              Animated.timing(opacity, { toValue: isFocused ? 1 : 0.7, duration: 180, useNativeDriver: true }),
              Animated.spring(translateY, { toValue: isFocused ? -3 : 0, useNativeDriver: true, friction: 7, tension: 140 }),
            ]).start();
          }, [isFocused]);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Cart badge count (example)
          const badgeCount = route.name === 'Cart' ? 3 : 0;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
            >
              <Animated.View
                style={[
                  styles.tabContent,
                  {
                    transform: [{ translateY }],
                    backgroundColor: isFocused ? 'rgba(14,165,233,0.12)' : 'transparent',
                    paddingHorizontal: isFocused ? 10 : 6,
                    paddingVertical: isFocused ? 6 : 4,
                    borderRadius: 14,
                  },
                ]}
              >
                <Animated.View style={[styles.iconContainer, { transform: [{ scale }], opacity }]}>
                  {React.cloneElement(iconNode as any, { size: 28 })}
                  {badgeCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badgeCount}</Text>
                    </View>
                  )}
                </Animated.View>
                <Animated.Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? activeColor : inactiveColor, opacity },
                  ]}
                >
                  {label}
                </Animated.Text>
                {isFocused && <View style={styles.activeIndicator} />}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.medium,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    paddingHorizontal: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    color: Colors.textOnPrimary,
    fontWeight: '600',
  },
});

