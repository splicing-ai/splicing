import { AnimatePresence, motion } from "framer-motion";
import { SendHorizontal, Loader2 } from "lucide-react";
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import useProjectStore from "@/store/project";

const ChatBottomBar = () => {
  const [message, setMessage] = useState<string>("");
  const [addMessage, loadingMessage] = useProjectStore((state) => [
    state.addMessage,
    state.loadingMessage,
  ]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  };

  const handleSend = async () => {
    if (message.trim()) {
      const newMessage = {
        role: "user",
        content: message.trim(),
      };
      setMessage("");
      await addMessage(newMessage);

      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyPress = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }

    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      setMessage((prev) => prev + "\n");
    }
  };

  return (
    <div className="p-2 flex flex-col w-full items-center gap-2">
      <AnimatePresence>
        {loadingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center text-sm text-muted-foreground mb-2"
          >
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingMessage}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex w-full space-x-1 items-center justify-center">
        <AnimatePresence initial={false}>
          <motion.div
            key="input"
            className="w-full relative"
            layout
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1 }}
            transition={{
              opacity: { duration: 0.05 },
              layout: {
                type: "spring",
                bounce: 0.15,
              },
            }}
          >
            <Textarea
              autoComplete="off"
              value={message}
              ref={inputRef}
              onKeyDown={handleKeyPress}
              onChange={handleInputChange}
              name="message"
              placeholder="Input your message"
              className="w-full border rounded-lg flex items-center min-h-9 max-h-48 resize-none overflow-y-auto bg-background transition-all duration-200 ease-in-out"
            ></Textarea>
          </motion.div>
          <Button
            variant="ghost"
            size="icon"
            className="flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            onClick={handleSend}
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatBottomBar;
