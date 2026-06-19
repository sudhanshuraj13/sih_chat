"use client";

import {
  AlertCircle,
  Bot,
  ChevronDown,
  Clipboard,
  Key,
  MessageCircle,
  PenLine,
  Send,
  Settings,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ApiConfig = {
  provider: string;
  model: string;
  key: string;
};

const PROVIDERS: Record<string, { name: string; models: string[] }> = {
  groq: { name: "Groq", models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"] },
  openai: { name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"] },
  google: { name: "Google", models: ["gemini-2.5-pro", "gemini-2.5-flash"] },
};

const DEFAULT_CONFIG: ApiConfig = { provider: "groq", model: "llama-3.3-70b-versatile", key: "" };

const STARTERS = [
  {
    icon: Sparkles,
    title: "Find a strong idea",
    prompt: "Suggest SIH problem statements for a team good at AI and web development.",
    meta: "Idea match",
  },
  {
    icon: MessageCircle,
    title: "Explain a statement",
    prompt: "Explain SIH25050 in simple language with possible solution directions.",
    meta: "Quick brief",
  },
  {
    icon: PenLine,
    title: "Shape my pitch",
    prompt: "Help me create a crisp SIH project pitch with problem, solution, users, and impact.",
    meta: "Presentation ready",
  },
];

export default function Chat() {
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [tempConfig, setTempConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("api_config");
      if (saved) {
        const parsed = JSON.parse(saved) as ApiConfig;
        setApiConfig(parsed);
        setTempConfig(parsed);
      }
    } catch {
      localStorage.removeItem("api_config");
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "0px";
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 132)}px`;
  }, [chatInput]);

  const saveConfig = () => {
    setApiConfig(tempConfig);
    localStorage.setItem("api_config", JSON.stringify(tempConfig));
    setShowSettings(false);
  };

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isLoading) return;

    if (!apiConfig.key) {
      setError("Add your API key in settings first, then I can start answering.");
      setShowSettings(true);
      return;
    }

    setError(null);
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    const assistantId = crypto.randomUUID();

    setMessages([...updatedMessages, { id: assistantId, role: "assistant", content: "" }]);
    setChatInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          apiKey: apiConfig.key,
          apiProvider: apiConfig.provider,
          apiModel: apiConfig.model,
        }),
      });

      if (!response.ok) {
        let errMsg = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream available.");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setMessages((prev) => prev.filter((m) => !(m.id === assistantId && m.content === "")));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(chatInput);
  };

  const copyMessage = async (message: Message) => {
    if (!message.content) return;
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1400);
  };

  const currentProvider = PROVIDERS[apiConfig.provider] || PROVIDERS.groq;

  return (
    <main className="min-h-screen overflow-hidden px-3 py-4 text-slate-900 sm:px-6 lg:px-8">
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-md">
          <section className="settings-panel w-full max-w-md overflow-hidden rounded-[28px]">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Connection</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">API Settings</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="icon-button"
                title="Close settings"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Provider</span>
                <span className="relative block">
                  <select
                    value={tempConfig.provider}
                    onChange={(e) => {
                      const newProvider = e.target.value;
                      setTempConfig({
                        ...tempConfig,
                        provider: newProvider,
                        model: PROVIDERS[newProvider].models[0],
                      });
                    }}
                    className="field-select"
                  >
                    {Object.entries(PROVIDERS).map(([key, p]) => (
                      <option key={key} value={key}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Model</span>
                <span className="relative block">
                  <select
                    value={tempConfig.model}
                    onChange={(e) => setTempConfig({ ...tempConfig, model: e.target.value })}
                    className="field-select"
                  >
                    {PROVIDERS[tempConfig.provider].models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">API Key</span>
                <input
                  type="password"
                  value={tempConfig.key}
                  onChange={(e) => setTempConfig({ ...tempConfig, key: e.target.value })}
                  placeholder="Paste your API key here"
                  className="field-input"
                />
                <span className="mt-2 block text-xs text-slate-500">
                  Saved only in this browser and sent only with chat requests.
                </span>
              </label>

              <button
                onClick={saveConfig}
                disabled={!tempConfig.key.trim()}
                className="primary-action w-full"
                type="button"
              >
                Save settings
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="chat-shell mx-auto flex h-[calc(100vh-2rem)] max-h-[920px] w-full max-w-6xl flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-white/65 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="brand-mark">
              <Bot size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-slate-950 sm:text-lg">SIH Companion</h1>
              <p className="truncate text-xs font-medium text-slate-500">
                Human-friendly help for problem statements and pitches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
              {apiConfig.key ? `${currentProvider.name} ready` : "Setup needed"}
            </span>
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  setError(null);
                }}
                className="icon-button"
                title="Clear chat"
                type="button"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="icon-button" title="Settings" type="button">
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_1fr]">
          <aside className="hidden border-r border-white/60 px-5 py-6 lg:block">
            <div className="assistant-card">
              <div className="mb-4 flex items-center gap-3">
                <div className="mini-avatar">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Ready to help</p>
                  <p className="text-xs text-slate-500">Ask, refine, copy, repeat.</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <p>Best for exploring SIH ideas, understanding themes, and turning rough thoughts into usable project direction.</p>
                <p className="rounded-2xl bg-white/70 p-3 text-xs font-medium text-slate-500">
                  Tip: mention your team skills and preferred domain for better suggestions.
                </p>
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-7">
              {messages.length === 0 ? (
                <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center py-8 text-center">
                  <div className="hero-mark">
                    <Bot size={28} />
                  </div>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-coral-600">
                    Hi, builder
                  </p>
                  <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                    What should we make clearer today?
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                    Bring an SIH problem statement, a theme, or a half-formed project idea. I will help you shape it into something your team can actually use.
                  </p>

                  {!apiConfig.key && (
                    <button onClick={() => setShowSettings(true)} className="setup-pill mt-6" type="button">
                      <Key size={15} />
                      Add API key to start
                    </button>
                  )}

                  <div className="mt-10 grid w-full gap-3 sm:grid-cols-3">
                    {STARTERS.map((starter) => {
                      const Icon = starter.icon;
                      return (
                        <button
                          key={starter.title}
                          onClick={() => void sendMessage(starter.prompt)}
                          className="starter-card text-left"
                          type="button"
                        >
                          <span className="starter-icon">
                            <Icon size={17} />
                          </span>
                          <span className="mt-5 block text-sm font-semibold text-slate-950">{starter.title}</span>
                          <span className="mt-1 block text-xs text-slate-500">{starter.meta}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-5">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`message-appear flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`message-row ${m.role === "user" ? "message-row-user" : ""}`}>
                        <div className={m.role === "user" ? "avatar-user" : "avatar-bot"}>
                          {m.role === "user" ? <User size={15} /> : <Bot size={15} />}
                        </div>
                        <div className="group min-w-0">
                          <div className={m.role === "user" ? "bubble-user" : "bubble-assistant"}>
                            <p className="whitespace-pre-wrap text-sm leading-6">{m.content || (isLoading ? "" : "...")}</p>
                          </div>
                          {m.role === "assistant" && m.content && (
                            <button
                              onClick={() => void copyMessage(m)}
                              className="copy-action"
                              type="button"
                            >
                              <Clipboard size={13} />
                              {copiedId === m.id ? "Copied" : "Copy"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && messages[messages.length - 1]?.content === "" && (
                    <div className="message-appear flex justify-start">
                      <div className="message-row">
                        <div className="avatar-bot">
                          <Bot size={15} />
                        </div>
                        <div className="bubble-assistant px-5 py-4">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="error-card message-appear flex items-center gap-3 rounded-2xl px-4 py-3">
                      <AlertCircle size={18} className="shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <footer className="border-t border-white/65 px-4 py-4 sm:px-6">
              <form onSubmit={onSubmit} className="composer">
                <textarea
                  ref={inputRef}
                  className="composer-input"
                  value={chatInput}
                  placeholder="Ask about SIH ideas, themes, problem statements..."
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage(chatInput);
                    }
                  }}
                  disabled={isLoading}
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={isLoading || chatInput.trim().length === 0}
                  className="send-button"
                  title="Send message"
                >
                  <Send size={18} />
                </button>
              </form>
              <p className="mt-2 text-center text-[11px] font-medium text-slate-400">
                Built by Sudhanshu Raj. 
              </p>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}
