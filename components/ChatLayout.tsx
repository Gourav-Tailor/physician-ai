"use client";

import { Sidebar } from "@/components/Sidebar";
import { ChatList } from "@/components/ChatList"; 
import { ChatWindow } from "@/components/ChatWindow";
import { useChatStore } from "@/store/chatStore";
import { useEffect } from "react";

export default function ChatLayout() {
  const { chats, createNewChat } = useChatStore();

  // Initialize with a chat if none exists
  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    }
  }, [chats.length, createNewChat]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - Fixed width */}
      <div className="w-16 flex-shrink-0 border-r">
        <Sidebar />
      </div>
      
      {/* Chat List - Fixed width */}
      <div className="w-80 flex-shrink-0 border-r">
        <ChatList />
      </div>
      
      {/* Chat Window - Flexible */}
      <div className="flex-1 min-w-0">
        <ChatWindow />
      </div>
    </div>
  );
}