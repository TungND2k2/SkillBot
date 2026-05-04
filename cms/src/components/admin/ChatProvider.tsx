"use client";

/**
 * Provider wrap toàn bộ Payload admin để render floating ChatBubble.
 * Bubble fix-position nên không phá layout của Payload — chỉ là overlay
 * dom node song song.
 */
import type { ReactNode } from "react";
import ChatBubble from "./ChatBubble";

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <>
    {children}
    <ChatBubble />
  </>
);

export default ChatProvider;
