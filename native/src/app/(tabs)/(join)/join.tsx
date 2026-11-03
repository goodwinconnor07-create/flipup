import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, Stack, useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { CodePad, useCode } from '@/components/code-pad';
import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { ThemedText } from '@/components/themed-text';
import { isCode, normalizeCode, variantInfo, type TableInfo } from '@/engine';
import { fetchTableInfo } from '@/state/api';
import { useProfile } from '@/state/profile';
import { joinOnlineTable } from '@/state/session';
import { radius, spacing, useColors } from '@/theme';

/** The code inside a scanned QR: the join link ends in it, or the text is just the code (the web's `codeFromScan`). */
function codeFromScan(text: string): string | null {
  let tail = text.trim();
  const m = /^[a-z]+:\/\/[^/]+(\/.*)?$/i.exec(tail);
  if (m) tail = m[1] ?? '';
  const code = normalizeCode(tail.split(/[/?#]/).filter(Boolean).pop() ?? '');
  return isCode(code) ? code : null;
}

/**
 * The Join tab: type the 5-letter table code with the iPhone keyboard, or scan the host's QR code. A code that's
 * found shows the table (the game, the host, who's there) and a Sit down button.
 */
export default function JoinTab() {
  const colors = useColors();
  const focused = useIsFocused();
  const profile = useProfile();
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<TableInfo | null>(null);
  const [permission, askPermission] = useCameraPermissions();

  const state = useCode(async (value) => {
    try {
      const info = await fetchTableInfo(value);
      if (!info) return "There's no table with that code. Check it and try again.";
      setFound(info);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Something went wrong. Try again.';
    }
  });

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

  const sitDown = () => {
    if (!found) return;
    if (!profile.name) {
      Alert.alert('Add your name first', 'Friends see your name and picture at the table.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Set up profile', onPress: () => router.push('/profile') },
      ]);
      return;
    }
    joinOnlineTable(found.code, profile.name, profile.emoji);
    setFound(null);
    state.setText('');
    router.push('/table');
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'Join', headerLargeTitleEnabled: true }} />
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
          <ThemedText tone="tertiaryLabel">Type the 5-letter code from whoever&apos;s hosting.</ThemedText>
          <CodePad state={state} label="Table code" focus={focused} />
          <Button title="Scan a QR code" variant="party" tint="pink" onPress={() => void scan()} />
        </>
      )}
    </ScrollView>
  );
}

/** The table a code found: its game, the host, who's sitting there, and Sit down (or why you can't). */
function TableCard({ info, onSit, onBack }: { info: TableInfo; onSit: () => void; onBack: () => void }) {
  const colors = useColors();
  const game = variantInfo(info.settings.variant);
  const people = info.players.filter((p) => !p.bot).length;
  const bots = info.players.length - people;
  const full = info.seatsLeft <= 0;
  const over = info.status === 'ended';
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ padding: spacing.md, gap: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
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
