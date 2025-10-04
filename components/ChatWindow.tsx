"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  MessageSquare,
} from "lucide-react";
import { useChatStore, ChatMessage } from "../store/chatStore";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";


export function ChatWindow() {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    currentChatId,
    addMessage,
    updateMessage,
    getCurrentChat,
    getCurrentMessages,
    generateMessageId,
    formatTime,
  } = useChatStore();

  const currentChat = getCurrentChat();
  const messages = getCurrentMessages();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    if (!currentChatId) return;

    const messageText = text?.trim() || inputRef.current?.value.trim();
    if (!messageText) return;

    const userMsg: ChatMessage = {
      id: generateMessageId(),
      author: "me",
      text: messageText,
      time: formatTime(),
    };

    addMessage(currentChatId, userMsg);

    // Clear input
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }

    // Add temporary bot message
    const botId = generateMessageId();
    const tempBotMsg: ChatMessage = {
      id: botId,
      author: "them",
      text: "…",
      time: "",
    };
    addMessage(currentChatId, tempBotMsg);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.author === "me" ? "user" : "assistant",
        content: m.text || "",
      }));

      const resp = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: history }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await resp.json();
      let prettyText = data.content;

      if (data.toolResult) {
        const parsed = JSON.parse(data.content || "{}");

        if (data.toolName === "createBooking" && !parsed.error) {
          prettyText = `✅ **Booking Confirmed!**

📋 **Test:** ${parsed.testName}
📅 **Date:** ${parsed.date}
⏰ **Time:** ${parsed.time}
📍 **Location:** ${parsed.location}
🆔 **Booking ID:** ${parsed.bookingId}
💰 **Price:** ${parsed.price ? `₹${parsed.price}` : 'Contact for pricing'}

${parsed.confirmationMessage || 'You will receive a confirmation SMS shortly.'}`;
        } else if (data.toolName === "priceLookup" && !parsed.error) {
          prettyText = `💰 **Price Information**

🧪 **Test:** ${parsed.testName}
💵 **Price:** ₹${parsed.price}
📋 **Currency:** ${parsed.currency || 'INR'}
📖 **Source:** ${parsed.source}

${parsed.note || ''}`;
        } else if (data.toolName === "getAvailableTests") {
          const tests = parsed.tests || [];
          prettyText = `🧪 **Available Lab Tests**

${tests.map((test: string) => `• ${test}`).join('\n')}

Would you like to know the price for any specific test or book an appointment?`;
        } else if (data.toolName === "getLocations") {
          const locations = parsed.locations || [];
          prettyText = `📍 **Available Locations**

${locations.map((location: string) => `• ${location}`).join('\n')}

🏠 **Home Collection:** ${parsed.homeCollection ? 'Available' : 'Not available'}
🏥 **Lab Visit:** ${parsed.labVisit ? 'Available' : 'Not available'}
🌍 **Service Area:** ${parsed.serviceAreas || 'Mumbai Metropolitan Region'}`;
        } else if (data.toolName === "handoff") {
          prettyText = `🙋‍♂️ **Connecting you to our support team**

${parsed.message}

📞 **Alternative Contact:** ${parsed.alternativeContact || 'Call 1800-XXX-XXXX'}
🕒 **Business Hours:** ${parsed.businessHours || '9:00 AM - 8:00 PM'}`;
        } else if (parsed.error) {
          prettyText = `⚠️ **Error**

${parsed.error}

${parsed.suggestions ? `\n**Suggestions:**\n${parsed.suggestions.map((s: string) => `• ${s}`).join('\n')}` : ''}`;
        }
      }

      updateMessage(currentChatId, botId, {
        text: prettyText,
        time: formatTime(),
      });
    } catch (err) {
      updateMessage(currentChatId, botId, {
        text: `❌ **Error:** ${String(err)}\n\nPlease try again or contact support.`,
        time: formatTime(),
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentChat) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No chat selected</h3>
            <p className="text-muted-foreground">
              Select a chat from the sidebar to start messaging
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/sa-avatar.png" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              SA
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">Swastya.ai</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-4 px-1.5 text-xs">
                Online
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Clear Chat</DropdownMenuItem>
              <DropdownMenuItem>Export Chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area - Fixed height with proper scroll */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Start the conversation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask about lab tests, prices, or book an appointment
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend("What tests are available?")}
                  >
                    Available Tests
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend("What are your locations?")}
                  >
                    Locations
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend("Price for CBC test")}
                  >
                    Test Prices
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 max-w-4xl bg-blue-50/50 p-2 rounded-lg",
                      message.author === "me" ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={message.author === "me" ? "/user-avatar.png" : "/sa-avatar.png"} />
                      <AvatarFallback
                        className={cn(
                          message.author === "me"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {message.author === "me" ? "U" : "SA"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 max-w-[80%]",
                        message.author === "me"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.text && (
                        <div className="prose prose-sm dark:prose-invert font-sans">
                          <ReactMarkdown>
                            {message.text}
                          </ReactMarkdown>
                        </div>
                      )}
                      {message.fileName && (
                        <div className="flex items-center gap-2 mt-2">
                          <Paperclip className="h-4 w-4" />
                          <span className="underline text-sm">{message.fileName}</span>
                        </div>
                      )}
                      <div className="flex justify-end mt-2">
                        <span className="text-xs opacity-70">{message.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex items-end gap-2 max-w-4xl">
          <Button variant="outline" size="icon" className="shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              className="pr-12 min-h-[40px] resize-none"
              onKeyDown={handleKeyPress}
              disabled={!currentChatId}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Smile className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button
            onClick={() => handleSend()}
            disabled={!currentChatId}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}