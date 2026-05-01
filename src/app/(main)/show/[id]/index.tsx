import { useLocalSearchParams } from 'expo-router';
import { ShowDetailScreen } from '@/screens/ShowDetailScreen';

export default function ShowRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShowDetailScreen id={id} />;
}
