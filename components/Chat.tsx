"use client";

import { useState, useRef } from "react";
import {
  Plus,
  MessageSquare,
  Users2,
  Settings,
  Phone,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
} from "lucide-react";

type ChatMessage = {
  id: string;
  author: "me" | "them";
  text?: string;
  fileName?: string;
  time: string;
};

function classNames(...list: (string | false | undefined)[]) {
  return list.filter(Boolean).join(" ");
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "m1", author: "them", text: "Hi 👋, how can I help you today?", time: "10:00" },
  ]);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `${Date.now()}`,
      author: "me",
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    inputRef.current?.focus();

    // Add placeholder bot message
    const botId = `${Date.now()}-bot`;
    setMessages((prev) => [
      ...prev,
      { id: botId, author: "them", text: "", time: "" },
    ]);

    try {
      // Build chat history for Groq
      const history = [...messages, userMsg].map((m) => ({
        role: m.author === "me" ? "user" : "assistant",
        content: m.text || "",
      }));

      // Call our API
      const resp = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: history }),
        headers: { "Content-Type": "application/json" },
      });

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let botText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        botText += decoder.decode(value, { stream: true });

        // Update bot message progressively
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId ? { ...m, text: botText, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) } : m
          )
        );
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId ? { ...m, text: `Error: ${String(err)}` } : m
        )
      );
    }
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-zinc-100">
      <div className="h-[100vh] w-full grid grid-cols-[72px_360px_1fr] bg-zinc-800">
        {/* Column 1: Sidebar */}
        <aside className="flex flex-col items-center justify-between border-r border-zinc-700 py-4">
          <div className="flex flex-col gap-4">
            <button className="size-11 rounded-full bg-zinc-700 hover:bg-zinc-600 grid place-items-center">
              <MessageSquare className="size-5" />
            </button>
            <button className="size-11 rounded-full bg-zinc-700 hover:bg-zinc-600 grid place-items-center">
              <Users2 className="size-5" />
            </button>
            <button className="size-11 rounded-full bg-zinc-700 hover:bg-zinc-600 grid place-items-center">
              <Phone className="size-5" />
            </button>
            <button className="size-11 rounded-full bg-zinc-700 hover:bg-zinc-600 grid place-items-center">
              <Settings className="size-5" />
            </button>
          </div>
        </aside>

        {/* Column 2: Placeholder chat list */}
        <section className="flex flex-col border-r border-zinc-700">
          <div className="h-14 flex items-center gap-2 px-3 border-b border-zinc-700">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className="w-full bg-zinc-700/60 rounded-full pl-9 pr-3 py-2 outline-none placeholder:text-zinc-400"
                placeholder="Search or start new chat"
              />
            </div>
            <button className="size-9 grid place-items-center rounded-full hover:bg-zinc-700">
              <MoreVertical className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto">
            <p className="px-4 py-3 text-zinc-400">Chat list goes here</p>
          </div>
        </section>

        {/* Column 3: Chat window */}
        <section className="flex flex-col">
          {/* Header */}
          <div className="h-14 flex items-center gap-3 px-4 border-b border-zinc-700">
            <div className="size-10 rounded-full bg-zinc-600 grid place-items-center">AI</div>
            <div className="flex-1">
              <p className="font-semibold leading-4">Swastya.ai</p>
              <p className="text-xs text-zinc-400 leading-4">online</p>
            </div>
            <button className="size-9 grid place-items-center rounded-full hover:bg-zinc-700">
              <Phone className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-zinc-800 p-4">
            <div className="max-w-3xl mx-auto flex flex-col gap-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={classNames(
                    "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                    m.author === "me"
                      ? "self-end bg-emerald-600 text-white"
                      : "self-start bg-zinc-700 text-zinc-100"
                  )}
                >
                  {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                  {m.fileName && (
                    <div className="flex items-center gap-2">
                      <Paperclip className="size-4" />
                      <span className="underline">{m.fileName}</span>
                    </div>
                  )}
                  <div className="text-[10px] opacity-70 mt-1 text-right">{m.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-zinc-700 p-3">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <button className="size-10 grid place-items-center rounded-full bg-zinc-700 hover:bg-zinc-600">
                <Plus className="size-5" />
              </button>
              <div className="flex-1 relative">
                <Smile className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message"
                  className="w-full bg-zinc-700 rounded-full pl-9 pr-14 py-3 outline-none placeholder:text-zinc-400"
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-9 grid place-items-center rounded-full bg-emerald-600 hover:bg-emerald-500"
                  onClick={handleSend}
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
