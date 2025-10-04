import { create } from "zustand";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
}

interface ChatState {
  messages: Message[];
  addMessage: (msg: Message) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  clear: () => set({ messages: [] }),
}));
