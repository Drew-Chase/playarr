import { useLocalSearchParams } from 'expo-router';
import { EpisodeDetailScreen } from '@/screens/EpisodeDetailScreen';

export default function EpisodeRoute() {
  const { id, epId } = useLocalSearchParams<{ id: string; epId: string }>();
  return <EpisodeDetailScreen showId={id} episodeId={epId} />;
}
