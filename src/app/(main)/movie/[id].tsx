import { useLocalSearchParams } from 'expo-router';
import { MovieDetailScreen } from '@/screens/MovieDetailScreen';

export default function MovieRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MovieDetailScreen id={id} posterPlacement="overlap" />;
}
