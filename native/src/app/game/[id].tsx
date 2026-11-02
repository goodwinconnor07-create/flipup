import { useLocalSearchParams } from 'expo-router';

import { ComingNext } from '@/components/coming-next';
import { variantInfo, type Variant } from '@/engine';

export default function GameSheet() {
  const { id } = useLocalSearchParams<{ id: Variant }>();
  return <ComingNext step={2} what={`${variantInfo(id).name}: the rules, then Play with friends or with bots.`} />;
}
