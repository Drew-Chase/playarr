import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
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
import type { HeroVariant } from '@/types/media';

interface HomeScreenProps {
  heroVariant?: HeroVariant;
}

export function HomeScreen({ heroVariant = 'classic' }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Hero
          title={featured.title}
          year={featured.year}
          rating={featured.rating}
          runtime={featured.runtime}
          resolution={featured.resolution}
          audio={featured.audio}
          synopsis={featured.synopsis}
          ctaLabel="Resume S2 \u00b7 E04"
          variant={heroVariant}
        />

        <View style={styles.rails}>
          <Rail
            heading="Continue Watching"
            data={continueWatching}
            estimatedItemSize={360}
            renderItem={(item) => (
              <BackdropCard
                title={item.title}
                sub={item.sub}
                progress={item.progress}
                runtime={item.runtime}
                episode={item.episode}
                width={336}
              />
            )}
          />

          <Rail
            heading="Recently Added \u2014 Movies"
            data={recentMovies}
            estimatedItemSize={244}
            renderItem={(item) => (
              <PosterCard
                title={item.title}
                year={item.year}
                watched={item.watched}
                width={220}
              />
            )}
          />

          <Rail
            heading="Recently Added \u2014 Shows"
            data={recentShows}
            estimatedItemSize={244}
            renderItem={(item) => (
              <PosterCard
                title={item.title}
                year={item.year}
                watched={item.watched}
                width={220}
              />
            )}
          />

          <Rail
            heading="Suggested for You"
            data={suggested}
            estimatedItemSize={244}
            renderItem={(item) => (
              <PosterCard
                title={item.title}
                year={item.year}
                watched={item.watched}
                width={220}
              />
            )}
          />

          <Rail
            heading="Collections"
            data={collections}
            estimatedItemSize={360}
            renderItem={(item) => (
              <BackdropCard
                title={item.title}
                sub={item.sub}
                width={336}
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
