import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { alpha, getTheme } from '../../theme';

const CONTENT = {
  terms: {
    title: 'Terms of Service',
    intro: 'These terms explain how RBT Genius can be used, what we provide, and the responsibilities of members using the platform.',
    sections: [
      { h: '1. About RBT Genius', b: 'RBT Genius is an educational platform designed to help users prepare for the Registered Behavior Technician exam through practice questions, flashcards, mock exams, analytics, and tutoring features. The platform is intended for study support and does not replace formal supervision, clinical judgment, or BACB guidance.' },
      { h: '2. Accounts and access', b: 'You are responsible for keeping your login credentials secure and for the activity that occurs under your account. You must provide accurate account information and use the service only for lawful and educational purposes.' },
      { h: '3. Membership plans', b: 'RBT Genius may offer free and premium access levels. Premium features may include expanded question access, mock exams, analytics, and billing tools. Plan details, pricing, and feature availability may change over time.' },
      { h: '4. Educational use only', b: 'Content inside RBT Genius is provided for study and review. It should not be treated as legal, medical, psychological, or supervisory advice. Users remain responsible for following the standards and requirements of the BACB, their employers, and their supervisors.' },
      { h: '5. Acceptable use', b: 'You may not misuse the platform, attempt unauthorized access, copy or resell protected content, interfere with service availability, or use automated methods to extract the question bank or system content without written permission.' },
      { h: '6. Service updates', b: 'We may improve, modify, or discontinue parts of the service as the product evolves. Reasonable effort will be made to maintain platform availability, but uninterrupted access is not guaranteed.' },
      { h: '7. Contact', b: 'For account or legal questions related to these terms, contact support@rbtgenius.app.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'This policy explains what information RBT Genius collects, how it is used, and how it supports your study experience.',
    sections: [
      { h: '1. Information we collect', b: 'We may collect account details such as your name, email address, login method, plan, study activity, attempts, mock exam results, usage analytics, and billing-related records connected to your account.' },
      { h: '2. Why we collect it', b: 'We use your information to operate the platform, save your progress, personalize your experience, manage subscriptions, improve product performance, and provide support when needed.' },
      { h: '3. Billing and payment data', b: 'Subscription payments may be processed through Stripe. RBT Genius may store payment metadata such as plan, amount, currency, status, Stripe customer IDs, and Stripe session or subscription references. Full card data is not stored directly by RBT Genius.' },
      { h: '4. OAuth and sign-in providers', b: 'If you sign in with providers such as Google, Apple, GitHub, or Microsoft, we may store your provider name, basic profile information, and linked account identifiers needed to support login and account recovery.' },
      { h: '5. Data retention', b: 'We retain account and study information for as long as needed to operate your account, maintain records, improve service quality, and comply with applicable legal or financial obligations.' },
      { h: '6. Contact', b: 'Privacy questions can be sent to support@rbtgenius.app.' },
    ],
  },
  refund: {
    title: 'Refund Policy',
    intro: 'This policy explains how refund requests are handled for RBT Genius premium memberships.',
    sections: [
      { h: '1. Subscription purchases', b: 'Premium access may be sold as monthly or yearly recurring billing. By purchasing a premium subscription, you authorize recurring charges according to the plan selected during checkout.' },
      { h: '2. Refund requests', b: 'Refund requests are reviewed on a case-by-case basis. If you believe you were charged in error or experienced a billing problem, contact us as soon as possible so we can review the situation.' },
      { h: '3. Non-refundable situations', b: 'In general, partial usage of a billing period, missed cancellations, or access to premium content alone may not automatically qualify for a refund. However, we will still review legitimate cases fairly.' },
      { h: '4. How to request help', b: 'For billing support or refund review, email support@rbtgenius.app and include the email used on your account, the plan involved, and the date of the charge.' },
    ],
  },
};

export default function LegalScreen({ route, navigation }) {
  const { type = 'terms' } = route?.params ?? {};
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const s = styles(theme);
  const content = CONTENT[type] ?? CONTENT.terms;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" color={theme.text} size={22} />
        </Pressable>
        <Text style={s.title}>{content.title}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>{content.intro}</Text>

        {content.sections.map((sec, i) => (
          <View key={i} style={s.section}>
            <Text style={s.secHeading}>{sec.h}</Text>
            <Text style={s.secBody}>{sec.b}</Text>
          </View>
        ))}

        <View style={s.contactBox}>
          <Feather name="mail" color={theme.primary} size={16} style={{ marginBottom: 6 }} />
          <Text style={s.contactText}>Questions? Email us at</Text>
          <Text style={s.contactEmail}>support@rbtgenius.app</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { color: theme.text, fontSize: 17, fontWeight: '800', flex: 1 },
  content: { padding: 22, gap: 22, paddingBottom: 52 },
  intro: { color: theme.muted, fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  section: { gap: 8 },
  secHeading: { color: theme.primary, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  secBody: { color: theme.text, fontSize: 14, lineHeight: 22 },
  contactBox: {
    backgroundColor: alpha(theme.primary, 0.06), borderColor: alpha(theme.primary, 0.15),
    borderWidth: 1, borderRadius: 18, padding: 18, alignItems: 'center', gap: 2, marginTop: 8,
  },
  contactText: { color: theme.muted, fontSize: 13 },
  contactEmail: { color: theme.primary, fontSize: 14, fontWeight: '700' },
});
