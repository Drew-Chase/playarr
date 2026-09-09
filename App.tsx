import { useEffect, useState } from 'react';
import { BackHandler, Dimensions, StatusBar, View } from 'react-native';
import { useFonts } from 'expo-font';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { Archivo_400Regular, Archivo_600SemiBold, Archivo_700Bold } from '@expo-google-fonts/archivo';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { StoreContext } from './src/store';
import { initServer, useAppStore } from './src/storeImpl';
import { TopBar } from './src/topbar';
import { Toast } from './src/ui';
import { Modals } from './src/modals';
import { HomeScreen } from './src/screens/Home';
import { GridScreen } from './src/screens/Grid';
import { DetailScreen } from './src/screens/Detail';
import { EpisodeScreen } from './src/screens/Episode';
import { CalendarScreen } from './src/screens/Calendar';
import { DownloadsScreen } from './src/screens/Downloads';
import { SearchScreen } from './src/screens/Search';
import { ProfileScreen } from './src/screens/Profile';
import { PlayerScreen } from './src/screens/Player';
import { C, refreshScale } from './src/theme';

export default function App() {
  const { s, a, ctx } = useAppStore();
  const [, setTick] = useState(0);

  const [loaded] = useFonts({
    ArchivoBlack_400Regular,
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => {
      refreshScale();
      setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      a.back();
      return true;
    });
    return () => sub.remove();
  }, [a]);

  useEffect(() => {
    initServer(a.set, a.flash);
  }, [a]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bgDeep }} />;

  const screen = () => {
    switch (s.screen) {
      case 'home':
        return <HomeScreen />;
      case 'grid':
        return <GridScreen />;
      case 'detail':
        return <DetailScreen />;
      case 'episode':
        return <EpisodeScreen />;
      case 'calendar':
        return <CalendarScreen />;
      case 'downloads':
        return <DownloadsScreen />;
      case 'search':
        return <SearchScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'player':
        return <PlayerScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <StoreContext.Provider value={ctx}>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {s.screen !== 'player' ? (
          <View style={{ flex: 1 }}>
            {screen()}
            <TopBar />
          </View>
        ) : (
          screen()
        )}
        <Modals />
        <Toast msg={s.toast} />
      </View>
    </StoreContext.Provider>
  );
}
