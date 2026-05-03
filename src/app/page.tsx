"use client";

import { useChat } from "@ai-sdk/react";
import { Send, Bot, User, AlertCircle, Settings, X, Key } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Chat() {
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState("");

  // Load API key from local storage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("groq_api_key");
    if (savedKey) {
      setApiKey(savedKey);
      setTempKey(savedKey);
    }
  }, []);

  const { messages, sendMessage, status, error } = useChat({
    api: "/api/chat",
    headers: apiKey ? { "x-groq-api-key": apiKey } : undefined,
  });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const saveApiKey = () => {
    setApiKey(tempKey);
    localStorage.setItem("groq_api_key", tempKey);
    setShowSettings(false);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen p-4" style={{ zIndex: 1 }}>
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Key size={18} className="text-sky-400" />
                API Settings
              </h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Groq API Key
                </label>
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
                <p className="text-xs text-white/40 mt-2">
                  Your API key is stored securely in your browser's local storage and is only sent directly to the Groq API.
                </p>
              </div>
              <button
                onClick={saveApiKey}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-sky-500/20"
              >
                Save API Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Container */}
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
            <span className="text-xs px-3 py-1 rounded-full font-medium hidden sm:inline-block"
              style={{ background: "rgba(14,165,233,0.15)", color: "rgb(125,211,252)", border: "1px solid rgba(14,165,233,0.25)" }}>
              AI Online
            </span>
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
                {!apiKey && (
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

          {/* Messages */}
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
                    {m.parts?.map((part, i) =>
                      part.type === "text" ? <span key={i}>{part.text}</span> : null
                    ) ?? m.content}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
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

          {/* Error */}
          {error && (
            <div className="message-appear error-card p-4 rounded-xl flex items-center gap-3">
              <AlertCircle size={18} className="flex-shrink-0" />
              <p className="text-sm">{error.message}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── Input Area ─── */}
        <div className="px-5 pb-5 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <form onSubmit={onSubmit} className="relative flex items-center">
            <input
              ref={inputRef}
              className="chat-input w-full pl-5 pr-14 py-4 rounded-xl text-sm"
              value={input}
              placeholder="Ask about SIH problem statements..."
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || input.trim().length === 0}
              className="send-btn absolute right-2 w-10 h-10 rounded-lg flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>
          <p className="text-center text-[10px] mt-3 text-white/20">
            Powered by Groq LLM & Vectra Vector Search
          </p>
        </div>
      </div>
    </div>
  );
}
