import React, { useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { colors, components, spacing } from '@/theme/tokens';
import { TopNav } from '@/components/layout/TopNav';
import { Hero } from '@/components/layout/Hero';
import { Rail } from '@/components/layout/Rail';
import { PosterCard } from '@/components/cards/PosterCard';
import { BackdropCard } from '@/components/cards/BackdropCard';
import {
  featured,
  continueWatching,
  recentMovies,
  recentShows,
  suggested,
  collections,
} from '@/fixtures/home';
import { TEST_BANNER, TEST_EPISODE, TEST_PORTRAIT } from '@/lib/test-images';
import type { HeroVariant } from '@/types/media';

interface HomeScreenProps {
  heroVariant?: HeroVariant;
}

export function HomeScreen({ heroVariant = 'classic' }: HomeScreenProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    viewportHeightRef.current = e.nativeEvent.layout.height;
  }, []);

  // Center the focused rail vertically; clamp to 0 so rails near the top
  // naturally pin instead of revealing dead space above the hero.
  const handleCardFocus = useCallback((railRef: React.RefObject<View | null>) => {
    const node = railRef.current;
    const scroll = scrollRef.current;
    const viewportH = viewportHeightRef.current;
    if (!node || !scroll || viewportH === 0) return;
    node.measure((_x, _y, _w, h, _pageX, pageY) => {
      const absoluteY = pageY + scrollOffsetRef.current;
      // The TopNav is overlaid at the top of the viewport, so the
      // perceived visible content area starts below it. Center the rail
      // within that area instead of the raw viewport.
      const visibleCenter = (components.topNav.height + viewportH) / 2;
      const target = absoluteY + h / 2 - visibleCenter;
      const clamped = Math.max(0, target);
      scroll.scrollTo({ y: clamped, animated: true });
    });
  }, []);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Hero
          title={featured.title}
          year={featured.year}
          rating={featured.rating}
          runtime={featured.runtime}
          resolution={featured.resolution}
          audio={featured.audio}
          synopsis={featured.synopsis}
          ctaLabel={'Resume S2 \u00b7 E04'}
          variant={heroVariant}
          backdropUrl={TEST_BANNER}
          posterUrl={TEST_PORTRAIT}
        />

        <View style={styles.rails}>
          <Rail
            heading="Continue Watching"
            data={continueWatching}
            estimatedItemSize={360}
            onCardFocus={handleCardFocus}
            renderItem={(item) => (
              <BackdropCard
                title={item.title}
                sub={item.sub}
                progress={item.progress}
                runtime={item.runtime}
                episode={item.episode}
                width={336}
                imageUrl={TEST_EPISODE}
              />
            )}
          />

          <Rail
            heading={'Recently Added \u2014 Movies'}
            data={recentMovies}
            estimatedItemSize={244}
            onCardFocus={handleCardFocus}
            renderItem={(item) => (
              <PosterCard
                title={item.title}
                year={item.year}
                watched={item.watched}
                width={220}
                imageUrl={TEST_PORTRAIT}
              />
            )}
          />

          <Rail
            heading={'Recently Added \u2014 Shows'}
            data={recentShows}
            estimatedItemSize={244}
            onCardFocus={handleCardFocus}
            renderItem={(item) => (
              <PosterCard
                title={item.title}
                year={item.year}
                watched={item.watched}
                width={220}
                imageUrl={TEST_PORTRAIT}
              />
            )}
          />

          <Rail
            heading="Suggested for You"
            data={suggested}
            estimatedItemSize={244}
            onCardFocus={handleCardFocus}
            renderItem={(item) => (
              <PosterCard
                title={item.title}
                year={item.year}
                watched={item.watched}
                width={220}
                imageUrl={TEST_PORTRAIT}
              />
            )}
          />

          <Rail
            heading="Collections"
            data={collections}
            estimatedItemSize={360}
            onCardFocus={handleCardFocus}
            renderItem={(item) => (
              <BackdropCard
                title={item.title}
                sub={item.sub}
                width={336}
                imageUrl={TEST_BANNER}
              />
            )}
          />
        </View>
      </ScrollView>

      <TopNav active="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  rails: {
    gap: spacing['3xl'],
    paddingBottom: spacing['5xl'],
  },
});
