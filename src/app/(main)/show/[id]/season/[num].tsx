import { useLocalSearchParams } from 'expo-router';
import { SeasonDetailScreen } from '@/screens/SeasonDetailScreen';

export default function SeasonRoute() {
  const { id, num } = useLocalSearchParams<{ id: string; num: string }>();
  return <SeasonDetailScreen showId={id} seasonNum={num} />;
}
