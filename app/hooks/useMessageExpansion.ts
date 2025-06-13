import { useState } from "react";

export function useMessageExpansion() {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const isMessageExpanded = (messageId: string) => {
    return expandedMessages.has(messageId);
  };

  const collapseAll = () => {
    setExpandedMessages(new Set());
  };

  const expandAll = (messageIds: string[]) => {
    setExpandedMessages(new Set(messageIds));
  };

  return {
    expandedMessages,
    toggleMessageExpansion,
    isMessageExpanded,
    collapseAll,
    expandAll,
  };
}
