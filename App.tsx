import { useEffect, useState } from 'react';
import { BackHandler, Dimensions, StatusBar, View } from 'react-native';
import { useFonts } from 'expo-font';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { Archivo_400Regular, Archivo_600SemiBold, Archivo_700Bold } from '@expo-google-fonts/archivo';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { StoreContext } from './src/store';
import { useAppStore } from './src/storeImpl';
import { FocusGraphProvider } from './src/focus/graph';
import {
  setCurrentScreen as engineSetCurrentScreen,
  focusTopBar as engineFocusTopBar,
  lastZoneWasTop as engineLastZoneWasTop,
  focusLastContent as engineFocusLastContent,
} from './src/focus/engine';
import { isConfigured, loadConfig, type AppConfig } from './src/config';
import { configureApi } from './src/api/client';
import { TopBar } from './src/topbar';
import { Toast } from './src/ui';
import { Modals } from './src/modals';
import { PairScreen } from './src/screens/Pair';
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
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const sRef = s;

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
    loadConfig().then((c) => {
      if (isConfigured(c)) configureApi(c.serverUrl, c.authToken);
      setCfg(c);
    });
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => {
      refreshScale();
      setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    engineSetCurrentScreen(s.screen);
  }, [s.screen]);

  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      const st = sRef;
      if (st.modal || st.settingsPane || st.upNext || st.screen === 'player' || st.screen === 'episode') {
        a.back();
        return true;
      }
      if (st.screen !== 'home') {
        a.back();
        setTimeout(() => engineFocusTopBar(), 80);
        return true;
      }
      if (!engineLastZoneWasTop() && engineFocusTopBar()) return true;
      return false;
    });
    return () => backSub.remove();
  }, [a]);

  if (!loaded || !cfg) return <View style={{ flex: 1, backgroundColor: C.bgDeep }} />;

  if (!isConfigured(cfg)) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bgDeep }}>
        <StatusBar hidden />
        <PairScreen
          onDone={() => {
            loadConfig().then((c) => {
              if (isConfigured(c)) configureApi(c.serverUrl, c.authToken);
              setCfg({ ...c });
            });
          }}
        />
      </View>
    );
  }

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
        return (
          <ProfileScreen
            onSignOut={() => {
              loadConfig().then((c) => {
                setCfg({ ...c });
              });
            }}
          />
        );
      case 'player':
        return <PlayerScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <FocusGraphProvider>
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
    </FocusGraphProvider>
  );
}
