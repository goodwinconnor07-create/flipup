import { useState } from 'react';
import { ActivityIndicator, Share, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { inviteMessage, inviteLink } from '@/state/invite-message';
import { brand, radius, ROUNDED, spacing, useColors, useShadows } from '@/theme';

import { haptic } from '../haptics';
import { Icon, type IconName } from '../icon';
import { PressableScale } from '../pressable-scale';
import { QRCode } from '../qr-code';

/**
 * The top of Play with friends: your table's code, big, with "You're hosting", then Show QR (the code to scan opens
 * under it) and Share link, a quiet link to invite from your contacts, and who has already sat down with the code.
 * The table is opened in the background as the page opens, so the code is real from the start.
 */
export function TableCodeCard({
  code,
  failed,
  people,
  onContacts,
}: {
  code: string | null;
  failed?: boolean;
  people: { name: string; emoji: string }[];
  onContacts: () => void;
}) {
  const colors = useColors();
  const shadows = useShadows();
  const [qr, setQr] = useState(false);
  const dim = colors.secondaryLabel as string;
  const share = () => {
    if (!code) return;
    haptic.tap();
    void Share.share({ message: inviteMessage({ code }), url: inviteLink(code) });
  };
  return (
    <View
      style={{
        padding: spacing.md,
        gap: spacing.md,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.cell,
        boxShadow: shadows.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text maxFontSizeMultiplier={1.2} style={{ flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, color: dim }}>
          GAME CODE
        </Text>
        <View
          style={{ paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, backgroundColor: `${brand.violet}33` }}
        >
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '700', color: brand.violetDark }}>
            You’re hosting
          </Text>
        </View>
      </View>

      {code ? (
        <Text
          accessibilityLabel={`Game code ${code.split('').join(' ')}`}
          maxFontSizeMultiplier={1.2}
          style={{ fontFamily: ROUNDED, fontSize: 48, lineHeight: 54, fontWeight: '800', letterSpacing: 6, color: colors.label as string }}
        >
          {code}
        </Text>
      ) : (
        <View style={{ height: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {!failed && <ActivityIndicator color={dim} />}
          <Text style={{ fontSize: 15, color: dim }}>
            {failed ? 'Couldn’t open your table. Deal will try again.' : 'Opening your table…'}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.sm, opacity: code ? 1 : 0.4 }}>
        <Action
          icon="qrcode"
          label={qr ? 'Hide QR' : 'Show QR'}
          onPress={() => {
            if (!code) return;
            haptic.select();
            setQr(!qr);
          }}
        />
        <Action icon="link" label="Share link" onPress={share} />
      </View>

      {qr && code && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{ alignSelf: 'center', padding: spacing.sm, borderRadius: radius.md, backgroundColor: '#ffffff' }}
        >
          <QRCode text={inviteLink(code)} size={180} label={`QR code to join table ${code}`} />
        </Animated.View>
      )}

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Invite from your contacts"
        onPress={onContacts}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 32 }}
      >
        <Icon name="person.crop.circle.badge.plus" size={17} color={brand.violetDark} />
        <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontSize: 15, fontWeight: '600', color: brand.violetDark }}>
          Invite from your contacts
        </Text>
        <Icon name="chevron.right" size={13} color={colors.tertiaryLabel as string} />
      </PressableScale>

      {people.length > 0 && (
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, color: dim }}>
          <Text style={{ color: colors.label as string, fontWeight: '600' }}>{people.map((p) => `${p.emoji} ${p.name}`).join(', ')}</Text>
          {people.length === 1 ? ' is in.' : ' are in.'}
        </Text>
      )}
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      outerStyle={{ flex: 1 }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        minHeight: 44,
        borderRadius: radius.full,
        backgroundColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <Icon name={icon} size={17} color={colors.label as string} />
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '600', color: colors.label as string }}>
        {label}
      </Text>
    </PressableScale>
  );
}
