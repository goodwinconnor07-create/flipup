import { Redirect, useLocalSearchParams } from 'expo-router';

import { isTableCode, normalizeTableCode } from '@/engine';

/** A party's link (`/party/ABCDE`, its QR code) opens the Join sheet with the code filled in; the sheet takes it into the party. */
export default function PartyLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const clean = normalizeTableCode(code ?? '');
  return isTableCode(clean) ? <Redirect href={{ pathname: '/join', params: { code: clean } }} /> : <Redirect href="/" />;
}
