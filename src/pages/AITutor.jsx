import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Crown,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";
import PremiumGate from "@/components/billing/PremiumGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { localizeText, translateUi } from "@/lib/i18n";
import { api } from "@/lib/api";

const suggestedTopics = [
  {
    label: "Quiz me",
    prompt: "Quiz me on core RBT concepts",
  },
  {
    label: "Explain simply",
    prompt: "Explain positive reinforcement in simple words",
  },
  {
    label: "Give an example",
    prompt: "Give me an example of prompting and fading",
  },
  {
    label: "Why is it wrong?",
    prompt: "Why is this answer wrong?",
  },
  {
    label: "Study plan",
    prompt: "Create a simple RBT study plan for me",
  },
  {
    label: "FBA help",
    prompt: "Explain functional behavior assessment with an example",
  },
];

export default function AITutor() {
  const { language } = useLanguage();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [entitlements, setEntitlements] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: profileData } = useQuery({
    queryKey: ["profile-data"],
    queryFn: api.getProfile,
  });

  useEffect(() => {
    if (profileData?.entitlements) {
      setEntitlements(profileData.entitlements);
    }
  }, [profileData]);

  const activeConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeConversationId) ||
      null,
    [activeConversationId, conversations],
  );

  const messages = activeConversation?.messages || [];
  const localizedMessages = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        localizedContent: localizeText(message.content, language),
      })),
    [language, messages],
  );
  const localizedSuggestedTopics = useMemo(
    () =>
      suggestedTopics.map((topic) => ({
        ...topic,
        label: translateUi(topic.label, language),
        prompt: translateUi(topic.prompt, language),
      })),
    [language],
  );

  useEffect(() => {
    let cancelled = false;

    api
      .listTutorConversations()
      .then((payload) => {
        if (cancelled) {
          return;
        }

        const nextConversations = Array.isArray(payload?.conversations)
          ? payload.conversations
          : [];
        setConversations(nextConversations);
        setActiveConversationId(nextConversations[0]?.id || null);
        setEntitlements(payload?.entitlements || null);
        setLoadingConvos(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setConversations([]);
        setActiveConversationId(null);
        setLoadingConvos(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleNewConversation = async () => {
    try {
      const payload = await api.createTutorConversation({ name: "New Chat" });
      setConversations((current) => [payload.conversation, ...current]);
      setActiveConversationId(payload.conversation.id);
      setEntitlements(payload?.entitlements || entitlements);
      setInput("");
    } catch (error) {
      toast({
        title: "Unable to start a chat",
        description: error.message || "Please try again.",
      });
    }
  };

  const handleSelectConversation = (conversationId) => {
    setActiveConversationId(conversationId);
  };

  const handleUsePrompt = (prompt) => {
    setInput(prompt);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) {
      return;
    }

    let conversationId = activeConversationId;
    if (!conversationId) {
      try {
        const payload = await api.createTutorConversation({
          name: text.slice(0, 50),
        });
        setConversations((current) => [payload.conversation, ...current]);
        setActiveConversationId(payload.conversation.id);
        setEntitlements(payload?.entitlements || entitlements);
        conversationId = payload.conversation.id;
      } catch (error) {
        toast({
          title: "Unable to start a chat",
          description: error.message || "Please try again.",
        });
        return;
      }
    }

    setInput("");
    setLoading(true);

    // Optimistic insertion: show the user message immediately and a placeholder
    // assistant message that we mutate as deltas arrive from the SSE stream.
    const optimisticUserId = `tmp_user_${Date.now()}`;
    const optimisticAssistantId = `tmp_assistant_${Date.now()}`;
    const nowIso = new Date().toISOString();

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id !== conversationId
          ? conversation
          : {
              ...conversation,
              messages: [
                ...(conversation.messages || []),
                { id: optimisticUserId, role: "user", content: text, created_at: nowIso },
                { id: optimisticAssistantId, role: "assistant", content: "", created_at: nowIso, streaming: true },
              ],
              updatedAt: nowIso,
            },
      ),
    );

    let streamedContent = "";
    const appendDelta = (delta) => {
      streamedContent += delta;
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id !== conversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === optimisticAssistantId
                    ? { ...message, content: streamedContent }
                    : message,
                ),
              },
        ),
      );
    };

    try {
      await api.streamTutorMessage(
        conversationId,
        { content: text },
        {
          onDelta: appendDelta,
          onDone: ({ message, entitlements: nextEntitlements }) => {
            if (nextEntitlements) setEntitlements(nextEntitlements);
            // Replace the placeholder with the persisted assistant message so
            // the id matches what the server saved.
            setConversations((current) =>
              current.map((conversation) =>
                conversation.id !== conversationId
                  ? conversation
                  : {
                      ...conversation,
                      messages: conversation.messages.map((existing) =>
                        existing.id === optimisticAssistantId
                          ? { ...message, streaming: false }
                          : existing,
                      ),
                    },
              ),
            );
            queryClient.invalidateQueries({ queryKey: ["profile-data"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
          },
          onError: (errorMessage) => {
            setConversations((current) =>
              current.map((conversation) =>
                conversation.id !== conversationId
                  ? conversation
                  : {
                      ...conversation,
                      messages: conversation.messages.filter(
                        (message) => message.id !== optimisticAssistantId,
                      ),
                    },
              ),
            );
            toast({
              title: "Tutor stream interrupted",
              description: errorMessage,
            });
          },
        },
      );
    } catch (error) {
      // Roll back the optimistic placeholders on hard failure.
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id !== conversationId
            ? conversation
            : {
                ...conversation,
                messages: conversation.messages.filter(
                  (message) =>
                    message.id !== optimisticUserId && message.id !== optimisticAssistantId,
                ),
              },
        ),
      );
      toast({
        title:
          error?.data?.code === "plan_limit_reached"
            ? "Daily AI tutor limit reached"
            : "Unable to send message",
        description:
          error?.data?.code === "plan_limit_reached"
            ? entitlements?.is_premium
              ? "Premium includes a generous daily AI tutor allowance. You have reached today's limit."
              : "Free accounts include 5 AI tutor messages per day."
            : error.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!entitlements?.can_access_ai_tutor) {
    return <PremiumGate feature="ai_tutor_limit" />;
  }

  const remainingMessages = entitlements?.usage?.tutor_messages_remaining;
  const limitReached = remainingMessages === 0;
  const tutorLimitDescription = entitlements?.is_premium
    ? "Premium includes a generous daily AI tutor allowance. You have reached today's limit."
    : "Free accounts can send 5 AI tutor messages per day. Upgrade to continue today.";

  return (
    <div className="mx-auto h-[calc(100vh-8rem)] max-w-7xl dark:rounded-[2rem] dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_24rem),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.82))] dark:p-3">
      <div className="flex h-full gap-4">
        <div className="flex w-72 flex-shrink-0 flex-col rounded-2xl border border-slate-100 bg-white dark:border-[#2A3554] dark:bg-[#141C31]/95">
          <div className="border-b border-slate-100 p-4 dark:border-[#28324E]">
            <Button
              onClick={handleNewConversation}
              className="w-full gap-2 rounded-xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
            >
              <Plus className="h-4 w-4" />
              {translateUi("New Chat", language)}
            </Button>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {loadingConvos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300 dark:text-slate-500" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                {translateUi("No conversations yet", language)}
              </p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                    activeConversationId === conversation.id
                      ? "bg-[#1E5EFF]/5 font-medium text-[#1E5EFF] dark:bg-[#1E5EFF]/12 dark:text-[#8EB0FF]"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#1B2640]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {conversation.metadata?.name || translateUi("Chat", language)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col rounded-2xl border border-slate-100 bg-white dark:border-[#2A3554] dark:bg-[#141C31]/95">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-[#28324E]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E5EFF] to-[#6366F1]">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {translateUi("Genius AI Tutor", language)}
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {translateUi("Your personal ABA and RBT exam coach", language)}
              </p>
            </div>
            <Sparkles className="ml-1 h-4 w-4 text-[#FFB800]" />
            {remainingMessages !== null && remainingMessages !== undefined ? (
              <div className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#FFB800]/20 bg-[#FFB800]/10 px-3 py-1 text-[11px] font-semibold text-[#C88700]">
                <Crown className="h-3 w-3" />
                <span>
                  {remainingMessages}{" "}
                  {translateUi(
                    entitlements?.is_premium
                      ? "tutor messages left today"
                      : "free messages left today",
                    language,
                  )}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-transparent p-6 dark:bg-[#11182D]/55">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex w-full max-w-3xl flex-col items-center justify-center rounded-[2rem] border border-transparent px-6 py-10 text-center dark:border-[#243250] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_18rem),linear-gradient(180deg,rgba(20,28,49,0.74),rgba(17,24,45,0.52))]">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E5EFF]/10 to-violet-100 dark:from-[#2F6CFF]/30 dark:to-[#253252]">
                  <Brain className="h-8 w-8 text-[#1E5EFF]" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {translateUi("Hello! I'm your AI Tutor", language)}
                </h3>
                <p className="mt-1 max-w-md text-sm text-slate-400 dark:text-slate-300">
                  {translateUi(
                    "Ask about ABA concepts, exam strategy, wrong answers, or ask me to quiz you. You can also paste a question and I will help break it down.",
                    language,
                  )}
                </p>

                <div className="mt-6 grid max-w-lg grid-cols-2 gap-3">
                  {localizedSuggestedTopics.map((topic) => (
                    <button
                      key={topic.label}
                      type="button"
                      onClick={() => handleUsePrompt(topic.prompt)}
                      className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-left text-xs text-slate-600 transition-all hover:border-[#1E5EFF]/30 hover:bg-[#1E5EFF]/5 dark:border-[#31466B] dark:bg-[#1C2742]/92 dark:text-slate-300 dark:shadow-[0_22px_45px_-36px_rgba(15,23,42,0.85)] dark:hover:border-[#4765B8] dark:hover:bg-[#243251]"
                    >
                      <span className="block font-medium text-slate-900 dark:text-slate-100">{topic.label}</span>
                      <span className="mt-1 block text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                        {topic.prompt}
                      </span>
                    </button>
                  ))}
                </div>
                </div>
              </div>
            ) : (
              localizedMessages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {translateUi("Thinking...", language)}
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-100 p-4 dark:border-[#28324E] dark:bg-[#141C31]/92">
            <div className="mb-3 flex flex-wrap gap-2">
              {localizedSuggestedTopics.slice(0, 4).map((topic) => (
                <button
                  key={`quick-${topic.label}`}
                  type="button"
                  onClick={() => handleUsePrompt(topic.prompt)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-[#1E5EFF]/30 hover:bg-[#1E5EFF]/5 hover:text-[#1E5EFF] dark:border-[#304062] dark:bg-[#1A2440] dark:text-slate-300 dark:hover:bg-[#223050] dark:hover:text-[#8EB0FF]"
                >
                  {topic.label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={translateUi("Ask about ABA concepts, exam tips...", language)}
                className="flex-1 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#1E5EFF]/20 dark:border-[#324160] dark:bg-[#212B42] dark:text-slate-100 dark:placeholder:text-slate-400"
              />
              <Button
                type="submit"
                disabled={!input.trim() || loading || limitReached}
                className="rounded-xl bg-[#1E5EFF] px-4 hover:bg-[#1E5EFF]/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {limitReached ? (
              <p className="mt-3 text-xs text-amber-600">
                {translateUi(tutorLimitDescription, language)}
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                {translateUi(
                  "Tip: paste a full question with answer choices if you want a clearer explanation.",
                  language,
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
