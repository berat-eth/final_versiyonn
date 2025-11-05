import { useEffect, useRef, useCallback } from 'react';
import { behaviorAnalytics } from '../services/BehaviorAnalytics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

interface UseBehaviorTrackingOptions {
  screenName: string;
  category?: string;
  trackScroll?: boolean;
  trackHeatMap?: boolean;
  enableTracking?: boolean;
}

export const useBehaviorTracking = (options: UseBehaviorTrackingOptions) => {
  const { screenName, category, trackScroll = true, trackHeatMap = true, enableTracking = true } = options;
  const scrollStartTime = useRef<number>(Date.now());
  const maxScrollDepth = useRef<number>(0);
  const scrollContainerRef = useRef<any>(null);
  const navigation = useNavigation();

  // Screen view tracking
  useFocusEffect(
    useCallback(() => {
      if (!enableTracking) return;

      // Screen başladı
      behaviorAnalytics.startScreenView(screenName, category);

      // Navigation path tracking
      const navigationState = navigation.getState();
      if (navigationState) {
        const currentRoute = navigationState.routes[navigationState.index];
        if (currentRoute.name !== screenName) {
          behaviorAnalytics.trackNavigation(currentRoute.name, screenName);
        }
      }

      // Cleanup: Screen bittiğinde
      return () => {
        behaviorAnalytics.endScreenView(screenName);
        
        // Scroll depth'i kaydet
        if (trackScroll && maxScrollDepth.current > 0) {
          behaviorAnalytics.flushScrollDepth(screenName);
        }
        
        // User segment güncelle - kategori bağımlılığı için
        behaviorAnalytics.calculateUserSegments();
      };
    }, [screenName, enableTracking, navigation, trackScroll])
  );

  // Scroll tracking
  const handleScroll = useCallback(
    (event: any) => {
      if (!enableTracking || !trackScroll) return;

      try {
        const nativeEvent = event?.nativeEvent;
        if (!nativeEvent) return;

        const scrollY = nativeEvent.contentOffset?.y || 0;
        const contentHeight = nativeEvent.contentSize?.height || 0;
        const scrollViewHeight = nativeEvent.layoutMeasurement?.height || 0;

        if (contentHeight > 0 && scrollViewHeight > 0) {
          const maxScroll = Math.max(0, contentHeight - scrollViewHeight);
          const scrollDepth = maxScroll > 0 ? Math.min(100, (scrollY / maxScroll) * 100) : 0;
          maxScrollDepth.current = Math.max(maxScrollDepth.current, scrollDepth);
          behaviorAnalytics.trackScrollDepth(screenName, scrollDepth);
        }
      } catch (error) {
        // Sessizce geç - scroll tracking kritik değil
      }
    },
    [screenName, trackScroll, enableTracking]
  );

  // Heat map tracking (click/touch)
  const handleHeatMapClick = useCallback(
    (
      elementType: string,
      x: number,
      y: number,
      elementId?: string,
      event?: any
    ) => {
      if (!enableTracking || !trackHeatMap) return;

      // Relative coordinates (0-100 percentage)
      let relativeX = x;
      let relativeY = y;

      // Event'ten koordinat al
      if (event?.nativeEvent) {
        const { pageX, pageY } = event.nativeEvent;
        const { width, height } = event.nativeEvent.target || {};
        
        if (width && height) {
          relativeX = (pageX / width) * 100;
          relativeY = (pageY / height) * 100;
        } else {
          relativeX = pageX;
          relativeY = pageY;
        }
      }

      behaviorAnalytics.trackClickHeatMap(screenName, elementType, relativeX, relativeY, elementId);
    },
    [screenName, trackHeatMap, enableTracking]
  );

  // Filter tracking
  const trackFilter = useCallback(
    (filterType: string, filterValue: string) => {
      if (!enableTracking) return;
      behaviorAnalytics.trackFilterUsage(screenName, filterType, filterValue);
    },
    [screenName, enableTracking]
  );

  // Sort tracking
  const trackSort = useCallback(
    (sortType: string) => {
      if (!enableTracking) return;
      behaviorAnalytics.trackSortPreference(screenName, sortType);
    },
    [screenName, enableTracking]
  );

  // Back navigation tracking
  useEffect(() => {
    if (!enableTracking) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Back navigation tespiti
      const action = e.data.action;
      if (action.type === 'GO_BACK' || action.type === 'POP') {
        const navigationState = navigation.getState();
        if (navigationState) {
          const routes = navigationState.routes;
          const currentIndex = navigationState.index;
          if (currentIndex > 0) {
            const previousScreen = routes[currentIndex - 1].name;
            behaviorAnalytics.trackBackNavigation(screenName, previousScreen);
          }
        }
      }
    });

    return unsubscribe;
  }, [navigation, screenName, enableTracking]);

  return {
    scrollContainerRef,
    handleScroll,
    handleHeatMapClick,
    trackFilter,
    trackSort,
  };
};

