"use client";

import { useRef, useEffect, useState } from "react";
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
  const [isStreaming, setIsStreaming] = useState(false);

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

  const formatToolResult = (toolName: string, content: string) => {
    try {
      const parsed = JSON.parse(content || "{}");
      
      if (toolName === "createBooking" && !parsed.error) {
        return `✅ **Booking Confirmed!**

📋 **Test:** ${parsed.testName}
📅 **Date:** ${parsed.date}
⏰ **Time:** ${parsed.time}
📍 **Location:** ${parsed.location}
🆔 **Booking ID:** ${parsed.bookingId}
💰 **Price:** ${parsed.price ? `₹${parsed.price}` : 'Contact for pricing'}

${parsed.confirmationMessage || 'You will receive a confirmation SMS shortly.'}`;
      } else if (toolName === "priceLookup" && !parsed.error) {
        return `💰 **Price Information**

🧪 **Test:** ${parsed.testName}
💵 **Price:** ₹${parsed.price}
📋 **Currency:** ${parsed.currency || 'INR'}
📖 **Source:** ${parsed.source}

${parsed.note || ''}`;
      } else if (toolName === "getAvailableTests") {
        const tests = parsed.tests || [];
        return `🧪 **Available Lab Tests**

${tests.map((test: string) => `• ${test}`).join('\n')}

Would you like to know the price for any specific test or book an appointment?`;
      } else if (toolName === "getLocations") {
        const locations = parsed.locations || [];
        return `📍 **Available Locations**

${locations.map((location: string) => `• ${location}`).join('\n')}

🏠 **Home Collection:** ${parsed.homeCollection ? 'Available' : 'Not available'}
🏥 **Lab Visit:** ${parsed.labVisit ? 'Available' : 'Not available'}
🌍 **Service Area:** ${parsed.serviceAreas || 'Mumbai Metropolitan Region'}`;
      } else if (toolName === "handoff") {
        return `🙋♂️ **Connecting you to our support team**

${parsed.message}

📞 **Alternative Contact:** ${parsed.alternativeContact || 'Call 1800-XXX-XXXX'}
🕒 **Business Hours:** ${parsed.businessHours || '9:00 AM - 8:00 PM'}`;
      } else if (parsed.error) {
        return `⚠️ **Error**

${parsed.error}

${parsed.suggestions ? `\n**Suggestions:**\n${parsed.suggestions.map((s: string) => `• ${s}`).join('\n')}` : ''}`;
      }
    } catch (e) {
      // If parsing fails, return the raw content
      return content;
    }
    
    return content;
  };

  const handleSend = async (text?: string) => {
    if (!currentChatId || isStreaming) return;
    
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

    // Add temporary bot message for streaming
    const botId = generateMessageId();
    const tempBotMsg: ChatMessage = {
      id: botId,
      author: "them",
      text: "…",
      time: "",
    };

    addMessage(currentChatId, tempBotMsg);
    setIsStreaming(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.author === "me" ? "user" : "assistant",
        content: m.text || "",
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: history }),
        headers: { 
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let buffer = "";

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6); // Remove 'data: ' prefix
                
                if (data.trim() === '') continue; // Skip empty data lines
                
                try {
                  const parsed = JSON.parse(data);
                  
                  if (parsed.type === 'content') {
                    // Accumulate content for streaming effect
                    accumulatedContent += parsed.content;
                    updateMessage(currentChatId, botId, {
                      text: accumulatedContent,
                      time: formatTime(),
                    });
                  } else if (parsed.type === 'tool_result') {
                    // Handle tool results
                    const formattedResult = formatToolResult(parsed.toolName, parsed.content);
                    accumulatedContent += formattedResult;
                    updateMessage(currentChatId, botId, {
                      text: accumulatedContent,
                      time: formatTime(),
                    });
                  } else if (parsed.type === 'error') {
                    // Handle errors
                    const errorMessage = `❌ **Error:** ${parsed.content}\n\nPlease try again or contact support.`;
                    updateMessage(currentChatId, botId, {
                      text: accumulatedContent + errorMessage,
                      time: formatTime(),
                    });
                  } else if (parsed.type === 'done') {
                    // Stream completed
                    updateMessage(currentChatId, botId, {
                      text: accumulatedContent || "Sorry, I didn't receive a complete response. Please try again.",
                      time: formatTime(),
                    });
                    break;
                  }
                } catch (parseError) {
                  console.error("Error parsing streaming data:", parseError, "Data:", data);
                }
              }
            }
          }
        } catch (streamError) {
          console.error("Streaming error:", streamError);
          updateMessage(currentChatId, botId, {
            text: accumulatedContent + "\n\n❌ **Streaming Error:** Connection interrupted. Please try again.",
            time: formatTime(),
          });
        } finally {
          setIsStreaming(false);
        }
      };

      await processStream();
      
    } catch (err) {
      console.error("Request error:", err);
      updateMessage(currentChatId, botId, {
        text: `❌ **Error:** ${String(err)}\n\nPlease try again or contact support.`,
        time: formatTime(),
      });
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentChat) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <MessageSquare className="h-16 w-16 mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">No chat selected</h3>
        <p className="text-sm">Select a chat from the sidebar to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">SA</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">Swastya.ai</h3>
            <Badge variant="secondary" className="text-xs">Online</Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Clear Chat</DropdownMenuItem>
            <DropdownMenuItem>Export Chat</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages Area - Fixed height with proper scroll */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Start the conversation</h3>
                  <p className="text-sm text-muted-foreground">Ask about lab tests, prices, or book an appointment</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-md">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend("What tests are available?")}
                    disabled={isStreaming}
                  >
                    Available Tests
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend("What are your locations?")}
                    disabled={isStreaming}
                  >
                    Locations
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend("Price for CBC test")}
                    disabled={isStreaming}
                  >
                    Test Prices
                  </Button>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.author === "me" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={message.author === "me" ? "/user-avatar.png" : "/sa-avatar.png"} alt="User Avatar" />
                    <AvatarFallback className={cn(
                      "text-xs",
                      message.author === "me" ? "bg-primary text-primary-foreground" : "bg-secondary"
                    )}>
                      {message.author === "me" ? "U" : "SA"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "flex-1 max-w-[85%]",
                    message.author === "me" ? "text-right" : "text-left"
                  )}>
                    {message.text && (
                      <div className={cn(
                        "rounded-lg px-3 py-2 inline-block max-w-full text-sm",
                        message.author === "me"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted"
                      )}>
                        <ReactMarkdown>
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    )}
                    {message.fileName && (
                      <Badge variant="outline" className="mt-1">
                        {message.fileName}
                      </Badge>
                    )}
                    <div className={cn(
                      "text-xs text-muted-foreground mt-1",
                      message.author === "me" ? "text-right" : "text-left"
                    )}>
                      {message.time}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="p-4 border-t bg-card">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              placeholder={isStreaming ? "AI is responding..." : "Type a message..."}
              onKeyPress={handleKeyPress}
              disabled={!currentChatId || isStreaming}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isStreaming}>
                <Paperclip className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isStreaming}>
                <Smile className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Button
            onClick={() => handleSend()}
            disabled={!currentChatId || isStreaming}
            className="shrink-0"
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}