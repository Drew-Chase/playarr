import { useLocalSearchParams } from 'expo-router';
import { PlayerScreen } from '@/screens/PlayerScreen';

export default function PlayerRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlayerScreen mediaId={id} transportVariant="classic" />;
}
