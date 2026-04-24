"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AppNav } from "@/components/ui/app-nav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, RefreshCw } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_PROMPTS = [
  "Which Toronto pages should I pitch for a restaurant client with a $3k budget?",
  "Draft a follow-up email for a prospect who ghosted after seeing the proposal.",
  "What's our current pipeline looking like?",
  "How do I handle a client who says social media doesn't work for their industry?",
  "Build me a pricing estimate for 2 pages in Vancouver with BA + Story posts.",
  "What's the best way to frame Option 3 vs Option 2 in a pitch?",
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-lg bg-[#E8192C] flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 mr-2">
          N
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-slate-900 text-white rounded-tr-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function NoriPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/nori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setStreamingContent(full);
      }

      setMessages((m) => [...m, { role: "assistant", content: full }]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Something went wrong. Try again." },
        ]);
      }
    } finally {
      setStreaming(false);
      setStreamingContent("");
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  }, [messages, streaming]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setStreamingContent("");
    setStreaming(false);
    setInput("");
    textareaRef.current?.focus();
  }

  const showSuggestions = messages.length === 0 && !streaming;

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <AppNav page="NORI" />

      <div className="flex-1 mx-auto w-full max-w-3xl px-4 flex flex-col py-6 gap-0">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#E8192C] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">NORI</div>
              <div className="text-xs text-muted-foreground">Northly AI — your sales co-pilot</div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              New chat
            </button>
          )}
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-3 text-center">
              Ask me anything about accounts, pricing, proposals, or your pipeline.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-left text-sm px-4 py-3 rounded-xl border bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 shadow-sm"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex-1 space-y-4 mb-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {streaming && (
              <div className="flex justify-start">
                <div className="h-7 w-7 rounded-lg bg-[#E8192C] flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 mr-2">
                  N
                </div>
                {streamingContent ? (
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-white border border-slate-200 text-slate-800 shadow-sm">
                    {streamingContent}
                    <span className="inline-block w-0.5 h-4 bg-slate-400 ml-0.5 animate-pulse align-text-bottom" />
                  </div>
                ) : (
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white border border-slate-200 shadow-sm">
                    <TypingIndicator />
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        <div className="sticky bottom-4 mt-auto">
          <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl shadow-md p-2 focus-within:border-slate-400 transition-colors">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask NORI anything…"
              rows={1}
              className="flex-1 border-0 shadow-none focus-visible:ring-0 resize-none text-sm py-1.5 min-h-0 bg-transparent"
              style={{ maxHeight: "120px", overflowY: "auto" }}
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || streaming}
              size="sm"
              className="self-end bg-[#E8192C] hover:bg-[#c0141f] rounded-xl h-8 w-8 p-0 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>

      </div>
    </main>
  );
}
