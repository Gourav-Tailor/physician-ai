import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  author: "me" | "them";
  text?: string;
  fileName?: string;
  time: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastMessage: string;
  lastMessageTime: string;
  createdAt: string;
  isHandoffMode?: boolean; // NEW: Track handoff mode per chat
}

interface StaticData {
  priceList: Record<string, number>;
  locations: string[];
  availableTests: string[];
}

interface ChatState {
  // Chat management
  chats: Chat[];
  currentChatId: string | null;
  
  // Static data
  staticData: StaticData;
  
  // Actions
  createNewChat: () => string;
  selectChat: (chatId: string) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  deleteChat: (chatId: string) => void;
  clearAllChats: () => void;
  
  // NEW: Handoff actions
  enableHandoffMode: (chatId: string) => void;
  disableHandoffMode: (chatId: string) => void;
  isHandoffActive: (chatId: string) => boolean;
  
  // Getters
  getCurrentChat: () => Chat | null;
  getCurrentMessages: () => ChatMessage[];
  
  // Helper functions
  generateMessageId: () => string;
  generateChatTitle: (firstMessage: string) => string;
  formatTime: () => string;
  getTestPrice: (testName: string) => number | null;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      chats: [],
      currentChatId: null,
      staticData: {
        priceList: {
          "cbc": 500,
          "vitamin d": 1200,
          "thyroid": 800,
          "blood sugar": 300,
          "cholesterol": 400,
          "liver function": 600,
          "kidney function": 550,
        },
        locations: [
          "Mumbai Central",
          "Andheri West", 
          "Bandra East",
          "Powai",
          "Thane",
          "Navi Mumbai"
        ],
        availableTests: [
          "CBC (Complete Blood Count)",
          "Vitamin D",
          "Thyroid Profile",
          "Blood Sugar",
          "Cholesterol Panel",
          "Liver Function Test",
          "Kidney Function Test"
        ]
      },

      // Actions
      createNewChat: () => {
        const newChatId = `chat_${Date.now()}`;
        const initialMessage: ChatMessage = {
          id: get().generateMessageId(),
          author: "them",
          text: "Hi! 👋 How can I help you today?",
          time: get().formatTime(),
        };

        const newChat: Chat = {
          id: newChatId,
          title: "New Chat",
          messages: [initialMessage],
          lastMessage: initialMessage.text!,
          lastMessageTime: initialMessage.time,
          createdAt: new Date().toISOString(),
          isHandoffMode: false, // NEW: Initialize handoff mode
        };

        set(state => ({
          chats: [newChat, ...state.chats],
          currentChatId: newChatId,
        }));

        return newChatId;
      },

      selectChat: (chatId: string) => set({ currentChatId: chatId }),

      addMessage: (chatId: string, message: ChatMessage) => {
        set(state => ({
          chats: state.chats.map(chat => 
            chat.id === chatId 
              ? {
                  ...chat,
                  messages: [...chat.messages, message],
                  lastMessage: message.text!,
                  lastMessageTime: message.time,
                  title: chat.title === "New Chat" && message.author === "me" 
                    ? get().generateChatTitle(message.text!)
                    : chat.title,
                }
              : chat
          )
        }));
      },

      updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => {
        set(state => ({
          chats: state.chats.map(chat => 
            chat.id === chatId 
              ? {
                  ...chat,
                  messages: chat.messages.map(msg => 
                    msg.id === messageId ? { ...msg, ...updates } : msg
                  )
                }
              : chat
          )
        }));
      },

      deleteChat: (chatId: string) => {
        set(state => {
          const remainingChats = state.chats.filter(chat => chat.id !== chatId);
          return {
            chats: remainingChats,
            currentChatId: state.currentChatId === chatId 
              ? (remainingChats.length > 0 ? remainingChats[0].id : null)
              : state.currentChatId,
          };
        });
      },

      clearAllChats: () => set({ chats: [], currentChatId: null }),

      // NEW: Handoff methods
      enableHandoffMode: (chatId: string) => {
        set(state => ({
          chats: state.chats.map(chat => 
            chat.id === chatId 
              ? { ...chat, isHandoffMode: true }
              : chat
          )
        }));
      },

      disableHandoffMode: (chatId: string) => {
        set(state => ({
          chats: state.chats.map(chat => 
            chat.id === chatId 
              ? { ...chat, isHandoffMode: false }
              : chat
          )
        }));
      },

      isHandoffActive: (chatId: string) => {
        const chat = get().chats.find(c => c.id === chatId);
        return chat?.isHandoffMode || false;
      },

      // Getters
      getCurrentChat: () => {
        const { chats, currentChatId } = get();
        return chats.find(chat => chat.id === currentChatId) || null;
      },

      getCurrentMessages: () => {
        const currentChat = get().getCurrentChat();
        return currentChat?.messages || [];
      },

      // Helper functions
      generateMessageId: () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      
      generateChatTitle: (firstMessage: string) => {
        const words = firstMessage.trim().split(' ');
        return words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
      },
      
      formatTime: () => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      },
      
      getTestPrice: (testName: string) => {
        const { staticData } = get();
        const key = testName.toLowerCase();
        return staticData.priceList[key] || null;
      },
    }),
    {
      name: "chat-storage",
      // Only persist chats, not temporary UI state
      partialize: (state) => ({ 
        chats: state.chats,
        currentChatId: state.currentChatId,
      }),
    }
  )
);
