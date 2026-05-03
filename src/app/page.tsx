"use client";

import { Send, Bot, User, AlertCircle, Settings, X, Key, ChevronDown } from "lucide-react";
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
  groq:   { name: "Groq",   models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"] },
  openai: { name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"] },
  google: { name: "Google", models: ["gemini-2.5-pro", "gemini-2.5-flash"] },
};

const DEFAULT_CONFIG: ApiConfig = { provider: "groq", model: "llama-3.3-70b-versatile", key: "" };

export default function Chat() {
  // ─── State ───
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [tempConfig, setTempConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Load saved config on mount ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem("api_config");
      if (saved) {
        const parsed = JSON.parse(saved) as ApiConfig;
        setApiConfig(parsed);
        setTempConfig(parsed);
      }
    } catch {}
  }, []);

  // ─── Auto-scroll to latest message ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Save settings ───
  const saveConfig = () => {
    setApiConfig(tempConfig);
    localStorage.setItem("api_config", JSON.stringify(tempConfig));
    setShowSettings(false);
  };

  // ─── Send a message ───
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || isLoading) return;

    // Validate API key before sending
    if (!apiConfig.key) {
      setError("Please set your API key first. Click the ⚙ Settings icon in the header.");
      return;
    }

    setError(null);

    // Add user message
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setChatInput("");
    setIsLoading(true);

    // Prepare an empty assistant message to stream into
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

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

      // Read the streaming text response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream available.");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
        );
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      // Remove empty assistant message if nothing was streamed
      setMessages((prev) => prev.filter((m) => !(m.id === assistantId && m.content === "")));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // ─── Current provider info ───
  const currentProvider = PROVIDERS[apiConfig.provider] || PROVIDERS.groq;

  return (
    <div className="relative flex items-center justify-center min-h-screen p-4" style={{ zIndex: 1 }}>
      {/* ═══ Settings Modal ═══ */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Key size={18} className="text-sky-400" />
                API Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Provider Select */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Provider</label>
                <div className="relative">
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
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-all appearance-none cursor-pointer"
                  >
                    {Object.entries(PROVIDERS).map(([key, p]) => (
                      <option key={key} value={key} className="bg-slate-900">{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                </div>
              </div>

              {/* Model Select */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Model</label>
                <div className="relative">
                  <select
                    value={tempConfig.model}
                    onChange={(e) => setTempConfig({ ...tempConfig, model: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-all appearance-none cursor-pointer"
                  >
                    {PROVIDERS[tempConfig.provider].models.map((m) => (
                      <option key={m} value={m} className="bg-slate-900">{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">API Key</label>
                <input
                  type="password"
                  value={tempConfig.key}
                  onChange={(e) => setTempConfig({ ...tempConfig, key: e.target.value })}
                  placeholder="Paste your API key here..."
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
                <p className="text-xs text-white/40 mt-2">
                  Stored in your browser only. Never sent anywhere except the selected provider.
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={saveConfig}
                disabled={!tempConfig.key.trim()}
                className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-sky-500/20"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Main Chat Container ═══ */}
      <div className="glass-card flex flex-col w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{ height: "calc(100vh - 2rem)", maxHeight: "900px" }}>

        {/* ─── Header ─── */}
        <div className="header-gradient px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl avatar-bot flex items-center justify-center">
                <Bot size={20} className="text-sky-400" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#002449] status-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">SIH Assistant</h1>
              <p className="text-xs text-sky-300/70 font-medium">Smart India Hackathon • RAG Powered</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {apiConfig.key && (
              <span className="text-xs px-3 py-1 rounded-full font-medium hidden sm:inline-block"
                style={{ background: "rgba(14,165,233,0.15)", color: "rgb(125,211,252)", border: "1px solid rgba(14,165,233,0.25)" }}>
                {currentProvider.name}
              </span>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all group"
              title="Settings"
            >
              <Settings size={18} className="group-hover:rotate-45 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* ─── Messages Area ─── */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl avatar-bot flex items-center justify-center"
                style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)" }}>
                <Bot size={36} className="text-sky-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white/90 mb-2">How can I help you today?</h2>
                <p className="text-sm text-white/40 max-w-sm mx-auto mb-4">
                  Ask me about SIH problem statements, themes, organizations, or any hackathon details.
                </p>
                {!apiConfig.key && (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-sm font-medium hover:bg-sky-500/30 transition-colors"
                  >
                    <Key size={14} />
                    Set API Key to Start
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                <span className="suggestion-chip px-4 py-2 rounded-full text-sm">&quot;Explain SIH25050&quot;</span>
                <span className="suggestion-chip px-4 py-2 rounded-full text-sm">&quot;Healthcare themes&quot;</span>
                <span className="suggestion-chip px-4 py-2 rounded-full text-sm">&quot;Blockchain projects&quot;</span>
                <span className="suggestion-chip px-4 py-2 rounded-full text-sm">&quot;AI problem statements&quot;</span>
              </div>
            </div>
          )}

          {/* Rendered Messages */}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`message-appear flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-1 ${
                  m.role === "user" ? "avatar-user" : "avatar-bot"
                }`}>
                  {m.role === "user" ? <User size={14} /> : <Bot size={14} className="text-sky-400" />}
                </div>
                {/* Bubble */}
                <div className={m.role === "user" ? "msg-user" : "msg-assistant"}>
                  <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {m.content || (isLoading ? "" : "...")}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && messages[messages.length - 1]?.content === "" && (
            <div className="message-appear flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-1 avatar-bot">
                  <Bot size={14} className="text-sky-400" />
                </div>
                <div className="msg-assistant px-5 py-4 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-sky-400 typing-dot"></div>
                  <div className="w-2 h-2 rounded-full bg-sky-400 typing-dot"></div>
                  <div className="w-2 h-2 rounded-full bg-sky-400 typing-dot"></div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="message-appear error-card p-4 rounded-xl flex items-center gap-3">
              <AlertCircle size={18} className="flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── Input Area ─── */}
        <div className="px-5 pb-5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <form onSubmit={onSubmit} className="relative flex items-center">
            <input
              ref={inputRef}
              className="chat-input w-full pl-5 pr-14 py-4 rounded-xl text-sm"
              value={chatInput}
              placeholder="Ask about SIH problem statements..."
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || chatInput.trim().length === 0}
              className="send-btn absolute right-2 w-10 h-10 rounded-lg flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>
          <p className="text-center text-[10px] mt-3 text-white/20">
            Powered by {currentProvider.name} &amp; Vectra Vector Search
          </p>
        </div>
      </div>
    </div>
  );
}
