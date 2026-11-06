import * as Contacts from 'expo-contacts';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Share, TextInput, View } from 'react-native';

import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { inviteMessage } from '@/state/invite-message';
import { useMyUsername } from '@/state/pals';
import { brand, radius, spacing, useColors } from '@/theme';

interface Person {
  id: string;
  name: string;
  first: string;
  phone: string;
}

/**
 * Invite friends to FlipUp: Share a link (the system share sheet) or pick someone from your contacts, which opens
 * Messages with a note written to them by name (with your table's code when `code` is passed). Contacts are read on
 * the phone only, after the system asks, and never sent anywhere.
 */
export default function InviteContactsSheet() {
  const colors = useColors();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { username } = useMyUsername();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [state, setState] = useState<'idle' | 'denied' | 'none'>('idle');
  const [query, setQuery] = useState('');

  const load = async () => {
    if (!(await Contacts.isAvailableAsync())) return setState('none');
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return setState('denied');
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.FirstName, Contacts.Fields.PhoneNumbers],
      sort: Contacts.SortTypes.FirstName,
    });
    setPeople(
      data.flatMap((c) => {
        const phone = c.phoneNumbers?.[0]?.number;
        return phone && c.name
          ? [{ id: c.id ?? c.name, name: c.name, first: c.firstName ?? c.name.split(' ')[0], phone: phone.replace(/[^\d+]/g, '') }]
          : [];
      }),
    );
  };
  useEffect(() => {
    // Contacts are read once, when the sheet opens; the list arrives from the system, not from a tap.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => setState('none'));
  }, []);

  const text = (p: Person) => {
    haptic.tap();
    const body = encodeURIComponent(inviteMessage({ first: p.first, username, code }));
    Linking.openURL(`sms:${p.phone}&body=${body}`).catch(() => Alert.alert("Couldn't open Messages", 'Try Share a link instead.'));
  };
  const share = () => {
    haptic.tap();
    void Share.share({ message: inviteMessage({ username, code }) });
  };

  const q = query.trim().toLowerCase();
  const shown = (people ?? []).filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 200);

  return (
    <SheetScroll
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}
      style={{ backgroundColor: colors.background }}
    >
      <Stack.Screen options={{ title: code ? 'Invite to your table' : 'Invite friends' }} />
      <Section
        footer={code ? `They get your table's code, ${code}, and a link that opens it.` : 'They get a note from you and a link to FlipUp.'}
      >
        <Row
          title="Share a link"
          subtitle="Messages, WhatsApp, anywhere"
          icon={{ symbol: 'square.and.arrow.up', color: brand.violet }}
          onPress={share}
        />
      </Section>

      {people ? (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search contacts"
            placeholderTextColor={colors.tertiaryLabel as string}
            autoCorrect={false}
            clearButtonMode="while-editing"
            style={{
              minHeight: 40,
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.cell,
              color: colors.label as string,
              fontSize: 17,
            }}
          />
          {shown.length ? (
            <Section header="Contacts">
              {shown.map((p) => (
                <Row key={p.id} title={p.name} detail="Invite" onPress={() => text(p)} chevron={false} />
              ))}
            </Section>
          ) : (
            <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center' }}>
              No contacts with a phone number match.
            </ThemedText>
          )}
        </View>
      ) : state === 'denied' ? (
        <Section footer="FlipUp can't see your contacts. You can allow it in Settings, or share a link instead.">
          <Row title="Open Settings" icon={{ symbol: 'gearshape.fill', color: brand.violet }} onPress={() => void Linking.openSettings()} />
        </Section>
      ) : state === 'none' ? (
        <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center' }}>
          Contacts aren&apos;t available here. Share a link instead.
        </ThemedText>
      ) : null}
    </SheetScroll>
  );
}
