import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { cardColors, radius, ROUNDED, spacing } from '@/theme';

import { haptic } from './haptics';
import { Icon } from './icon';
import { LivingCard } from './living-card';
import { PressableScale } from './pressable-scale';
import { QRCode } from './qr-code';
import { ThemedText } from './themed-text';


/**
 * How friends get in, like a ticket: the code big across the top in letter tiles, Share as a small round button in
 * the corner, and the QR code on a white stub under it (they scan it from FlipUp's Join tab). A tap on the QR code
 * shows it big, for a phone across the table.
 */
export function InviteTicket({ code, link, kind = 'table', share }: { code: string; link: string; kind?: 'table' | 'party'; share: string }) {
  const [big, setBig] = useState(false);
  const label = kind === 'party' ? 'Party code' : 'Table code';
  const onShare = () => {
    haptic.tap();
    void Share.share({ message: `${share} Code ${code}: ${link}`, url: link });
  };
  return (
    <LivingCard colors={cardColors.violet} radius={radius.lg} style={{ padding: spacing.md, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ThemedText variant="footnote" tone="onColor" style={{ flex: 1, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.85 }}>
          {label}
        </ThemedText>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Share the link"
          haptics={false}
          onPress={onShare}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          <Icon name="square.and.arrow.up" size={18} color="#ffffff" />
        </PressableScale>
      </View>
      <View accessible accessibilityLabel={`${label} ${code.split('').join(' ')}`} style={{ flexDirection: 'row', gap: spacing.xs }}>
        {code.split('').map((ch, i) => (
          <View key={i} style={{ flex: 1, height: 68, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: 'rgba(255, 255, 255, 0.16)', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.32)', alignItems: 'center', justifyContent: 'center' }}>
            <Text maxFontSizeMultiplier={1} style={{ fontFamily: ROUNDED, fontSize: 36, fontWeight: '800', color: '#ffffff' }}>
              {ch}
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={big ? 'Show the QR code smaller' : 'Show the QR code bigger'}
        onPress={() => {
          haptic.tap();
          setBig((b) => !b);
        }}
        style={({ pressed }) => ({ flexDirection: big ? 'column' : 'row', alignItems: 'center', gap: spacing.md, opacity: pressed ? 0.85 : 1 })}
      >
        <View style={{ padding: spacing.xxs, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: '#ffffff' }}>
          <QRCode text={link} size={big ? 240 : 96} />
        </View>
        {!big && (
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="headline" tone="onColor">
              Or scan it
            </ThemedText>
            <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.8 }}>
              From FlipUp&apos;s Join tab. Tap to make it bigger.
            </ThemedText>
          </View>
        )}
      </Pressable>
    </LivingCard>
  );
}
