import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, Stack, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { CodePad, useCode } from '@/components/code-pad';
import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { isTableCode, normalizeTableCode, variantInfo, type TableInfo } from '@/engine';
import { fetchTableInfo } from '@/state/api';
import { joinParty, readParty } from '@/state/party';
import { askForName } from '@/state/ask-name';
import { readProfile } from '@/state/profile';
import { joinOnlineTable } from '@/state/session';
import { brand, gradient, radius, spacing, useColors, useShadows } from '@/theme';

/** The code inside a scanned QR: the join link ends in it (a table's or a party's), or the text is just the code (the web's `codeFromScan`). */
function codeFromScan(text: string): string | null {
  let tail = text.trim();
  const m = /^[a-z]+:\/\/[^/]+(\/.*)?$/i.exec(tail);
  if (m) tail = m[1] ?? '';
  const code = normalizeTableCode(tail.split(/[/?#]/).filter(Boolean).pop() ?? '');
  return isTableCode(code) ? code : null;
}

/** Sits you down in a party, and opens it (the sheet closes first). */
async function intoParty(code: string): Promise<void> {
  await joinParty(code);
  router.back();
  router.navigate('/party-room');
}

/**
 * The Join sheet, opened from the round button on Play (and by a join link, `/ABCDE` or `/party/ABCDE`, which
 * arrive with `code`): type the game code (six letters or numbers, like ACES42) with the iPhone keyboard, which comes up as the sheet opens, or
 * scan the host's QR code. A code that's found shows the table (the game, the host, who's there) and a Sit down
 * button. A party code (typed or scanned) takes you into the party.
 */
export default function JoinSheet() {
  const colors = useColors();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ code?: string }>();
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<TableInfo | null>(null);
  const [permission, askPermission] = useCameraPermissions();

  const state = useCode(async (value) => {
    try {
      const info = await fetchTableInfo(value);
      if (info) {
        setFound(info);
        return null;
      }
      // One place to join anything: a party code works here too.
      if (await readParty(value).catch(() => null)) {
        await intoParty(value);
        return null;
      }
      return "There's no table or party with that code. Check it and try again.";
    } catch (e) {
      return e instanceof Error ? e.message : 'Something went wrong. Try again.';
    }
  }, 'table');

  // A join link fills the boxes, and the look-up runs as if it had been typed.
  const linked = params.code ? normalizeTableCode(params.code) : '';
  const { fill } = state;
  useEffect(() => {
    if (isTableCode(linked)) fill(linked);
  }, [linked]); // eslint-disable-line react-hooks/exhaustive-deps

  const scan = async () => {
    state.setError('');
    if (!permission?.granted) {
      const answer = await askPermission();
      if (!answer.granted) {
        Alert.alert('Camera is off for FlipUp', 'Turn it on in Settings to scan codes, or type the code instead.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Settings', onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
    }
    setScanning(true);
  };
  const onScan = (text: string) => {
    const code = codeFromScan(text);
    if (!code) {
      if (!state.error) state.setError("That QR code isn't a FlipUp table.");
      return;
    }
    haptic.tap();
    setScanning(false);
    state.fill(code);
  };

  const sitDown = async () => {
    if (!found) return;
    // A new player is asked for a name right here, on top of this sheet, and carries on to the table.
    if (!(await askForName())) return;
    const me = readProfile();
    joinOnlineTable(found.code, me.name, me.emoji);
    router.back();
    router.push('/table');
  };

  return (
    <SheetScroll keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xxl, paddingBottom: spacing.xxxl, gap: spacing.lg }}>
      {/* No nav bar: its title sat over the sheet's own and blurred it. The big title below is the sheet's. */}
      <Stack.Screen options={{ title: 'Join', headerShown: false }} />
      {!found && <JoinBadge />}
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="title1" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {found ? 'Found it' : 'Join with a code'}
        </ThemedText>
        {!found && !scanning && (
          <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center' }}>
            Type the game code from whoever&apos;s hosting. A party code works too: type it and press Go.
          </ThemedText>
        )}
      </View>
      {found ? (
        <TableCard
          info={found}
          onSit={sitDown}
          onBack={() => {
            setFound(null);
            state.setText('');
          }}
        />
      ) : scanning ? (
        <>
          <View style={{ aspectRatio: 1, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.cell }}>
            {focused && <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(r) => onScan(r.data)} />}
          </View>
          <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center' }}>
            Point the camera at the QR code on the host&apos;s phone.
          </ThemedText>
          {state.error ? (
            <ThemedText tone="red" style={{ textAlign: 'center' }}>
              {state.error}
            </ThemedText>
          ) : null}
          <Button title="Type the code instead" variant="secondary" onPress={() => setScanning(false)} />
        </>
      ) : (
        <>
          <CodePad state={state} label="Table or party code" focus={focused} />
          <Button title="Scan a QR code" variant="party" tint="pink" onPress={() => void scan()} />
        </>
      )}
    </SheetScroll>
  );
}

/** The table a code found: its game, the host, who's sitting there, and Sit down (or why you can't). */
function TableCard({ info, onSit, onBack }: { info: TableInfo; onSit: () => void; onBack: () => void }) {
  const colors = useColors();
  const shadows = useShadows();
  const game = variantInfo(info.settings.variant);
  const people = info.players.filter((p) => !p.bot).length;
  const bots = info.players.length - people;
  const full = info.seatsLeft <= 0;
  const over = info.status === 'ended';
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ padding: spacing.md, gap: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: shadows.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <GameThumb variant={game.id} size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="title3" style={{ fontWeight: '700' }}>
              {game.name}
            </ThemedText>
            <ThemedText tone="tertiaryLabel">
              {info.hostName}&apos;s table · {info.code}
            </ThemedText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {info.players.map((p, i) => (
            <Avatar key={i} emoji={p.emoji} size={36} />
          ))}
        </View>
        <ThemedText tone="secondaryLabel">
          {people} {people === 1 ? 'person' : 'people'}
          {bots ? `, ${bots} ${bots === 1 ? 'bot' : 'bots'}` : ''} · {info.status === 'lobby' ? 'waiting to start' : over ? 'finished' : 'playing now'}
        </ThemedText>
      </View>
      <Button title={over ? 'This table has finished' : full ? 'The table is full' : 'Sit down'} variant="party" tint="green" size="lg" disabled={over || full} onPress={onSit} />
      <Button title="Use another code" variant="secondary" onPress={onBack} />
    </View>
  );
}

/**
 * The sheet's picture, over its title: an app-icon tile in the icon's own blue gradient with two people on it and a
 * small green plus on its corner, for sitting down at someone else's table.
 */
function JoinBadge() {
  const colors = useColors();
  const size = 76;
  const plus = 30;
  return (
    <View accessible={false} style={{ alignSelf: 'center', width: size, height: size, marginBottom: -spacing.xs }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.2237,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 24px -8px rgba(21, 47, 134, 0.7)',
          ...gradient('linear-gradient(160deg, #4a7bf0 0%, #152f86 100%)'),
        }}
      >
        <Icon name="person.2.fill" size={36} color="#ffffff" />
      </View>
      <View
        style={{
          position: 'absolute',
          right: -plus / 3,
          bottom: -plus / 3,
          width: plus,
          height: plus,
          borderRadius: plus / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: brand.raise,
          borderWidth: 3,
          borderColor: colors.background,
        }}
      >
        <Icon name="plus" size={14} color="#ffffff" weight="bold" />
      </View>
    </View>
  );
}
