import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { gradient, party, radius, spacing, useShadows } from '@/theme';

import { haptic } from './haptics';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { QRCode } from './qr-code';
import { ThemedText } from './themed-text';

const TICKET = `linear-gradient(150deg, ${party.blue} 0%, #5b3dff 100%)`;

/**
 * How friends get in, like a ticket: the QR code on a white stub (they scan it from FlipUp's Join tab), the code in
 * letter tiles and Share. A tap on the QR code shows it big, for a phone across the table.
 */
export function InviteTicket({ code, link, kind = 'table', share }: { code: string; link: string; kind?: 'table' | 'party'; share: string }) {
  const shadow = useShadows();
  const [big, setBig] = useState(false);
  const label = kind === 'party' ? 'Party code' : 'Table code';
  const onShare = () => {
    haptic.tap();
    void Share.share({ message: `${share} Code ${code}: ${link}`, url: link });
  };
  return (
    <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadow.soft, padding: spacing.sm, ...gradient(TICKET) }}>
      {big ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Show the QR code smaller" onPress={() => setBig(false)} style={{ padding: spacing.xs, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: '#ffffff' }}>
            <QRCode text={link} size={240} />
          </Pressable>
          <Codes code={code} label={label} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show the QR code bigger"
            onPress={() => {
              haptic.tap();
              setBig(true);
            }}
            style={({ pressed }) => ({ padding: spacing.xxs, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: '#ffffff', opacity: pressed ? 0.85 : 1 })}
          >
            <QRCode text={link} size={116} />
          </Pressable>
          {/* The perforation between the stub and the ticket. */}
          <View style={{ alignSelf: 'stretch', marginHorizontal: spacing.sm, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.45)' }} />
          <View style={{ flex: 1, gap: spacing.xs, alignItems: 'flex-start' }}>
            <Codes code={code} label={label} />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Share the link"
              onPress={onShare}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: '#ffffff', borderBottomWidth: 3, borderBottomColor: party.edge }}
            >
              <Icon name="square.and.arrow.up" size={17} color={party.blue} />
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '700', color: party.blue }}>
                Share
              </Text>
            </PressableScale>
          </View>
        </View>
      )}
    </View>
  );
}

function Codes({ code, label }: { code: string; label: string }) {
  return (
    <View style={{ gap: spacing.xxs }}>
      <ThemedText variant="caption1" tone="onColor" style={{ fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.85 }}>
        {label}
      </ThemedText>
      <View accessible accessibilityLabel={`${label} ${code.split('').join(' ')}`} style={{ flexDirection: 'row', gap: spacing.xxs }}>
        {code.split('').map((ch, i) => (
          <View key={i} style={{ width: 30, height: 38, borderRadius: radius.sm, borderCurve: 'continuous', backgroundColor: 'rgba(255, 255, 255, 0.18)', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.35)', alignItems: 'center', justifyContent: 'center' }}>
            <Text maxFontSizeMultiplier={1} style={{ fontSize: 20, fontWeight: '800', color: '#ffffff' }}>
              {ch}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
