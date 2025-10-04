"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MessageSquare,
  Users2,
  Settings,
  Phone,
  Plus,
} from "lucide-react";
import { useChatStore } from "@/store/chatStore";

export function Sidebar() {
  const { createNewChat, selectChat } = useChatStore();

  const handleNewChat = () => {
    const newChatId = createNewChat();
    selectChat(newChatId);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-muted/20 p-2">
        {/* Top buttons */}
        <div className="flex flex-col gap-2 flex-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-xl"
                onClick={handleNewChat}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>New Chat</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" 
                size="icon"
                className="h-12 w-12 rounded-xl"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>All Chats</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon" 
                className="h-12 w-12 rounded-xl"
              >
                <Users2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Contacts</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-xl"
              >
                <Phone className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Calls</p>
            </TooltipContent>
          </Tooltip>
          
        </div>

        {/* Bottom button */}
        <div className="mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-xl"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}