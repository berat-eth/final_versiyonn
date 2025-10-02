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
import { Colors, Gradients } from '../theme/colors';
import { Spacing, Shadows, BorderRadius } from '../theme/theme';

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

const tabColors: { [key: string]: string[] } = {
  Home: Gradients.primary,
  Products: Gradients.accent,
  Cart: Gradients.pink,
  Profile: Gradients.green,
  Custom: Gradients.secondary,
};

export const ModernTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Glassmorphism Background */}
      <View style={styles.glassBackground}>
        <View style={styles.tabBar}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel || options.title || route.name;
            const isFocused = state.index === index;
            const iconName = tabIcons[route.name] || 'apps';
            const activeColor = options.tabBarActiveTintColor || Colors.primary;
            const inactiveColor = options.tabBarInactiveTintColor || Colors.textLight;
            const gradientColors = tabColors[route.name] || Gradients.primary;
            
            const iconNode = typeof options.tabBarIcon === 'function'
              ? options.tabBarIcon({ color: isFocused ? activeColor : inactiveColor, size: 26 })
              : (
                  <Icon
                    name={iconName}
                    size={26}
                    color={isFocused ? activeColor : inactiveColor}
                  />
                );

            // Simple Animations
            const opacity = useRef(new Animated.Value(isFocused ? 1 : 0.6)).current;
            const translateY = useRef(new Animated.Value(0)).current;

            useEffect(() => {
              Animated.timing(opacity, { 
                toValue: isFocused ? 1 : 0.6, 
                duration: 150, 
                useNativeDriver: true 
              }).start();
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

            // Badge value from screen options (supports number or string)
            const badgeValue = options.tabBarBadge;

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
                activeOpacity={0.7}
              >
                <Animated.View 
                  style={[
                    styles.tabContent,
                    { transform: [{ translateY }] }
                  ]}
                >
                  {/* Active subtle background */}
                  {isFocused && (<View style={styles.activeBackground} />)}
                  
                  <Animated.View style={[styles.iconContainer, { opacity }]}>
                    {React.cloneElement(iconNode as any, { size: 24 })}
                    {badgeValue != null && badgeValue !== 0 && (
                      <View style={[styles.badge, options.tabBarBadgeStyle]}> 
                        <Text style={styles.badgeText}>{String(badgeValue)}</Text>
                      </View>
                    )}
                  </Animated.View>
                  
                  {/* Label: her zaman göster, odaklı değilken düşük opaklık */}
                  <Animated.Text
                    style={[
                      styles.tabLabel,
                      { color: isFocused ? activeColor : inactiveColor, opacity }
                    ]}
                  >
                    {label}
                  </Animated.Text>
                  
                  {/* Active dot indicator */}
                  {isFocused && (<View style={styles.activeDot} />)}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  glassBackground: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  tabBar: {
    flexDirection: 'row',
    height: 58,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 44,
    minHeight: 36,
  },
  activeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 0,
    zIndex: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 2,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: Colors.red,
    borderRadius: BorderRadius.round,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
});

