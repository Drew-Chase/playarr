import { useLocalSearchParams } from 'expo-router';
import { RequestScreen } from '@/screens/RequestScreen';

export default function RequestRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RequestScreen mediaId={id} />;
}
