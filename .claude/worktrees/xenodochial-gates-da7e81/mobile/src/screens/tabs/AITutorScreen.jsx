import { useState, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';

import { alpha, getTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'https://rbtgenius.com';

const QUICK_PROMPTS = [
  'Explain positive reinforcement',
  'What is extinction?',
  'Difference between DTT and NET?',
  'What is a functional behavior assessment?',
  'Define stimulus control',
];

export default function AITutorScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { user, token } = useAuth();
  const s = styles(theme);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm your RBT study tutor. Ask me anything about ABA principles, behavior intervention, or the RBT task list.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const listRef = useRef(null);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  // Creates a new conversation and returns its id
  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    const res = await fetch(`${API_BASE}/api/ai-tutor/conversations`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: 'Study Session' }),
    });
    if (!res.ok) throw new Error('Could not start a tutor session.');
    const data = await res.json();
    const id = data.conversation.id;
    setConversationId(id);
    return id;
  };

  const send = async (text) => {
    const msg = text.trim();
    if (!msg || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');

    const userMsg = { id: Date.now().toString(), role: 'user', text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const convId = await ensureConversation();

      const res = await fetch(
        `${API_BASE}/api/ai-tutor/conversations/${convId}/messages`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ content: msg }),
        }
      );

      if (res.status === 403) {
        // Plan limit reached
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: data.message || 'Daily tutor limit reached. Upgrade to Pro for unlimited messages.',
          },
        ]);
        return;
      }

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();
      const msgs = data.conversation?.messages || [];
      const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
      const reply = lastAssistant?.content || 'Sorry, I could not get a response.';

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', text: reply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: e.message === 'Could not start a tutor session.'
            ? e.message
            : 'Connection error. Please check your internet and try again.',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
        {!isUser && (
          <View style={s.avatarDot}>
            <Text style={s.avatarDotText}>AI</Text>
          </View>
        )}
        <View style={[s.bubbleBubble, isUser ? s.bubbleBubbleUser : s.bubbleBubbleAssistant]}>
          <Text style={[s.bubbleText, isUser && { color: '#fff' }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.screenTitle}>AI Tutor</Text>
        <Text style={s.screenSub}>Powered by RBT Genius · Ask anything</Text>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={s.typingRow}>
                <View style={s.avatarDot}><Text style={s.avatarDotText}>AI</Text></View>
                <View style={s.typingBubble}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              </View>
            ) : null
          }
        />

        {messages.length === 1 && (
          <View style={s.quickWrap}>
            <Text style={s.quickLabel}>Try asking:</Text>
            <View style={s.quickRow}>
              {QUICK_PROMPTS.map((p) => (
                <Pressable key={p} style={s.quickChip} onPress={() => send(p)}>
                  <Text style={s.quickChipText}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about RBT concepts..."
            placeholderTextColor={theme.muted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
          >
            <Text style={s.sendBtnText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    topBar: {
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1,
    },
    screenTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
    screenSub: { color: theme.muted, fontSize: 12, marginTop: 2 },
    listContent: { padding: 16, gap: 12, paddingBottom: 8 },
    bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '90%' },
    bubbleUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
    bubbleAssistant: { alignSelf: 'flex-start' },
    avatarDot: {
      width: 30, height: 30, borderRadius: 10, backgroundColor: alpha(theme.primary, 0.15),
      alignItems: 'center', justifyContent: 'center',
    },
    avatarDotText: { color: theme.primary, fontSize: 9, fontWeight: '900' },
    bubbleBubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '100%' },
    bubbleBubbleUser: { backgroundColor: theme.primary, borderBottomRightRadius: 6 },
    bubbleBubbleAssistant: {
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
      borderBottomLeftRadius: 6,
    },
    bubbleText: { color: theme.text, fontSize: 15, lineHeight: 22 },
    typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 4 },
    typingBubble: {
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
      borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 18, paddingVertical: 14,
    },
    quickWrap: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
    quickLabel: { color: theme.muted, fontSize: 12, fontWeight: '700' },
    quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    quickChip: {
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
      borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
    },
    quickChipText: { color: theme.text, fontSize: 13, fontWeight: '600' },
    inputBar: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 10,
      padding: 12, borderTopColor: alpha(theme.border, 0.6), borderTopWidth: 1,
      backgroundColor: theme.background,
    },
    input: {
      flex: 1, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
      borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12,
      color: theme.text, fontSize: 15, maxHeight: 120,
    },
    sendBtn: {
      width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  });
