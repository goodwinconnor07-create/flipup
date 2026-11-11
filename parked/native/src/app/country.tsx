import { router, Stack } from 'expo-router';
import { Text } from 'react-native';

import { APP_INFO } from '../../appInfo';
import { flagOf } from '@/components/board-row';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { SheetScroll } from '@/components/sheet-scroll';
import { COUNTRY_KEY, ensureMyCode } from '@/state/pals';
import { save, useStored } from '@/state/storage';
import { spacing } from '@/theme';

const COUNTRIES: [string, string][] = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IE', 'Ireland'], ['AU', 'Australia'], ['NZ', 'New Zealand'],
  ['HK', 'Hong Kong'], ['SG', 'Singapore'], ['JP', 'Japan'], ['KR', 'South Korea'], ['IN', 'India'], ['PH', 'Philippines'],
  ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'], ['IT', 'Italy'], ['NL', 'Netherlands'], ['BE', 'Belgium'], ['SE', 'Sweden'],
  ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['PL', 'Poland'], ['PT', 'Portugal'], ['CH', 'Switzerland'], ['AT', 'Austria'],
  ['BR', 'Brazil'], ['MX', 'Mexico'], ['AR', 'Argentina'], ['ZA', 'South Africa'],
];

/** The phone's own region setting (never the network's location): the suggestion at the top. */
function phoneRegion(): string | null {
  try {
    const region = new Intl.Locale(Intl.DateTimeFormat().resolvedOptions().locale).region;
    return region && /^[A-Z]{2}$/.test(region) ? region : null;
  } catch {
    return null;
  }
}

/** Settings > Show my country: off by default; the phone's region suggested first; your flag shows on the public boards. */
export default function CountrySheet() {
  const chosen = useStored<string | null>(COUNTRY_KEY, null);
  const suggested = phoneRegion();
  const pick = (code: string | null) => {
    haptic.select();
    save(COUNTRY_KEY, code);
    void ensureMyCode().catch(() => undefined);
    router.back();
  };
  const name = (c: string) => COUNTRIES.find(([k]) => k === c)?.[1] ?? c;
  const row = (c: string) => <Row key={c} title={name(c)} leading={<Text style={{ fontSize: 22 }}>{flagOf(c)}</Text>} detail={chosen === c ? '✓' : undefined} chevron={false} onPress={() => pick(c)} />;
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'Show my country' }} />
      <Section footer={APP_INFO.privacyBoards}>
        <Row title="Don’t show" detail={chosen ? undefined : '✓'} chevron={false} onPress={() => pick(null)} />
        {suggested && row(suggested)}
      </Section>
      <Section>{COUNTRIES.filter(([c]) => c !== suggested).map(([c]) => row(c))}</Section>
    </SheetScroll>
  );
}
