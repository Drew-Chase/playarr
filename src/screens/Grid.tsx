import { useRef } from 'react';
import { FlatList, Text, View } from 'react-native';
import { C, F, pctOf, px } from '../theme';
import { Chip, Focusable, ImgOrGrad, TitleGlyph } from '../ui';
import { TITLES, useStore } from '../store';
import type { PlexMediaItem } from '../api/types';
import { useLibraries, useLibraryItems } from '../api/useLive';
import { displayTitle, posterUrl, progressPct, subFor } from '../api/mappers';

const COLS = 6;
const ROW_H = 486;

type GridEntry = PlexMediaItem | (typeof TITLES)[number];

export function GridScreen() {
  const { s, a } = useStore();
  const listRef = useRef<FlatList<GridEntry> | null>(null);
  const lastRowRef = useRef(-1);
  const { data: libs } = useLibraries();
  const lib = libs?.find((l) => l.type === (s.gridKind === 'movie' ? 'movie' : 'show'));
  const { data: items } = useLibraryItems(lib?.key ?? null);

  const live = items ?? null;
  const gridSource: GridEntry[] = live
    ? live
    : s.gridKind === 'movie'
      ? TITLES.filter((t) => t.kind === 'movie')
      : TITLES.filter((t) => t.kind === 'show');
  const isLive = (x: GridEntry): x is PlexMediaItem => 'ratingKey' in x;
  const inProgress = (x: GridEntry) => (isLive(x) ? !!x.viewOffset : !!x.prog);
  const isWatched = (x: GridEntry) => (isLive(x) ? !!x.viewCount : x.prog !== null && x.prog > 0.85);
  const gridList =
    s.gridFilter === 'In progress'
      ? gridSource.filter(inProgress)
      : s.gridFilter === 'Unwatched'
        ? gridSource.filter((x) => !isWatched(x))
        : gridSource;

  const onItemFocus = (index: number) => {
    const row = Math.floor(index / COLS);
    if (row !== lastRowRef.current) {
      lastRowRef.current = row;
      listRef.current?.scrollToOffset({ offset: Math.max(0, row * px(ROW_H) - px(10)), animated: true });
    }
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: px(64), paddingTop: px(150), paddingBottom: px(40) }}>
      <Text style={{ fontFamily: F.head, fontSize: px(44), color: C.text }}>
        {s.gridKind === 'movie' ? 'Movies' : 'TV Shows'}
      </Text>
      <Text style={{ fontSize: px(17), color: '#7f868c', marginTop: px(8) }}>
        {gridList.length + ' of ' + gridSource.length + ' titles · ' + s.gridFilter}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: px(24), marginBottom: px(10) }}>
        {(['All', 'In progress', 'Unwatched'] as const).map((f, i) => (
          <Chip key={f} label={f} active={s.gridFilter === f} hasTV={i === 0} onPress={() => a.set({ gridFilter: f })} />
        ))}
      </View>
      <FlatList
        ref={listRef}
        data={gridList}
        numColumns={COLS}
        keyExtractor={(x) => (isLive(x) ? x.ratingKey : x.id)}
        renderItem={({ item, index }) => (
          <View style={{ width: px(268), marginBottom: px(30) }}>
            {isLive(item) ? (
              <Focusable
                hasTV={index === 0}
                onPress={() => a.openTitle(item.ratingKey)}
                onFocus={() => onItemFocus(index)}
                focusStyle={{ transform: [{ scale: 1.05 }] }}
              >
                <View style={{ height: px(398), borderRadius: px(14), overflow: 'hidden', backgroundColor: '#000' }}>
                  <ImgOrGrad uri={posterUrl(item)} art={['#1b3566', '#101a3a', '#05060c']} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
                    {progressPct(item) ? (
                      <View style={{ height: px(5), backgroundColor: 'rgba(255,255,255,.2)' }}>
                        <View style={{ height: '100%', width: progressPct(item), backgroundColor: C.accent }} />
                      </View>
                    ) : null}
                  </View>
                </View>
              </Focusable>
            ) : (
              <Focusable
                hasTV={index === 0}
                onPress={() => a.openTitle(item.id)}
                onFocus={() => onItemFocus(index)}
                focusStyle={{ transform: [{ scale: 1.05 }] }}
              >
                <View style={{ height: px(398), borderRadius: px(14), overflow: 'hidden', backgroundColor: '#000' }}>
                  <ImgOrGrad art={item.art} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                  <View style={{ position: 'absolute', left: px(18), right: px(18), bottom: px(18) }}>
                    <TitleGlyph t={item.t} ink={item.ink} size={28} />
                  </View>
                  {item.prog !== null && item.prog <= 0.85 && item.prog > 0 ? (
                    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(5), backgroundColor: 'rgba(255,255,255,.2)' }}>
                      <View style={{ height: '100%', width: pctOf(item.prog * 100), backgroundColor: C.accent }} />
                    </View>
                  ) : null}
                </View>
              </Focusable>
            )}
            <Text numberOfLines={1} style={{ marginTop: px(12), fontSize: px(17), fontWeight: '600', color: C.text }}>
              {isLive(item) ? displayTitle(item) : item.t}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: px(15), color: '#868d93', marginTop: px(3) }}>
              {isLive(item) ? subFor(item) : item.yr + ' · ' + (item.kind === 'show' ? item.seasons + ' seasons' : item.ep)}
            </Text>
          </View>
        )}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        windowSize={5}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        onScroll={(e) => a.set({ scrollY: e.nativeEvent.contentOffset.y })}
        scrollEventThrottle={64}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ fontSize: px(17), color: '#7f868c', marginTop: px(30) }}>No titles match this filter.</Text>
        }
      />
    </View>
  );
}
