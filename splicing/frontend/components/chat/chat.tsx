"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, RotateCcw, User, Bot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import ChatBottomBar from "@/components/chat/chat-bottom-bar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useProjectStore from "@/store/project";

const Chat = () => {
  const [reset, setReset] = useState<boolean>(false);
  const [messages, resetConversation] = useProjectStore((state) => [
    state.messages,
    state.resetConversation,
  ]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [hasUserSentMessage, setHasUserSentMessage] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>("");

  const handleReset = async () => {
    setHasUserSentMessage(false);
    await resetConversation();
    setReset(true);
    setTimeout(() => setReset(false), 2000);
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  const lastMessage = messages[messages.length - 1];
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.role === "assistant") {
        if (hasUserSentMessage) {
          let index = 0;
          const interval = setInterval(() => {
            if (index < lastMessage.content.length) {
              setStreamingContent(lastMessage.content.slice(0, index + 1));
              index++;
              scrollToBottom();
            }
          }, 10);
          return () => clearInterval(interval);
        } else {
          scrollToBottom();
        }
      } else if (lastMessage.role === "user") {
        setHasUserSentMessage(true);
        scrollToBottom();
      }
    }
  }, [lastMessage, hasUserSentMessage]);

  return (
    <div className="w-full h-full flex flex-col border rounded-lg">
      <header className="flex-none h-10 p-4 z-10 relative">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-medium leading-none tracking-tight">
            Assistant
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="rounded-full w-6 h-6"
                  size="icon"
                  variant="ghost"
                  onClick={handleReset}
                >
                  {reset ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  <span className="sr-only">Reset</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Reset</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Separator className="my-4" />
      </header>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto min-h-0 scroll-smooth mt-4"
      >
        <div className="w-full flex flex-col">
          <AnimatePresence>
            {messages?.map(
              (message, index) =>
                message.role !== "system" &&
                message.content !== "" && (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, scale: 1, y: 50, x: 0 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, scale: 1, y: 1, x: 0 }}
                    transition={{
                      opacity: { duration: 0.1 },
                      layout: {
                        type: "spring",
                        bounce: 0.3,
                        duration: messages.indexOf(message) * 0.05 + 0.2,
                      },
                    }}
                    style={{
                      originX: 0.5,
                      originY: 0.5,
                    }}
                    className={cn(
                      "flex flex-col gap-2 p-4 whitespace-pre-wrap",
                      message.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    <div className="flex gap-3 items-start">
                      {message.role === "user" ? (
                        <>
                          <div className="bg-secondary/20 dark:bg-secondary/30 p-3 rounded-md max-w-xs border border-secondary/20 dark:border-secondaryy/40">
                            <ReactMarkdown className="prose dark:prose-invert text-sm leading-relaxed">
                              {message.content.replace(/\n/gi, "\n &nbsp;")}
                            </ReactMarkdown>
                          </div>
                          <Avatar className="bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
                            <User className="h-8 w-8" />
                          </Avatar>
                        </>
                      ) : (
                        <>
                          <Avatar className="bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
                            <Bot className="h-8 w-8" />
                          </Avatar>
                          <div className="bg-secondary/20 dark:bg-secondary/30 p-3 rounded-md max-w-xs space-y-3 border border-secondary/20 dark:border-secondary/40">
                            <ReactMarkdown className="prose dark:prose-invert text-sm leading-relaxed">
                              {index === messages.length - 1 &&
                              hasUserSentMessage
                                ? streamingContent.replace(/\n/gi, "\n &nbsp;")
                                : message.content.replace(/\n/gi, "\n &nbsp;")}
                            </ReactMarkdown>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                ),
            )}
          </AnimatePresence>
        </div>
      </div>

      <footer className="flex-none bg-background">
        <ChatBottomBar />
      </footer>
    </div>
  );
};

export default Chat;
