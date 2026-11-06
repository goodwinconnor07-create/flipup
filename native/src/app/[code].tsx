import { Redirect, useLocalSearchParams } from 'expo-router';

import { isTableCode, normalizeTableCode } from '@/engine';

/**
 * A table's join link (`/ABCDE`, what the lobby's QR code and Share send) opens the Join sheet with the code filled
 * in. Any other single word that isn't a screen goes Home.
 */
export default function JoinLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const clean = normalizeTableCode(code ?? '');
  return isTableCode(clean) ? <Redirect href={{ pathname: '/join', params: { code: clean } }} /> : <Redirect href="/" />;
}
