"use client";

import { RefreshCw, MessageSquare } from "lucide-react";
import { HyperlaneMessage } from "../lib/hyperlane";
import { MessageCard } from "./MessageCard";
import { MessageFilters } from "./MessageFilters";
import { PaginationControls } from "./PaginationControls";
import { useMessageExpansion } from "../hooks/useMessageExpansion";
import { usePagination } from "../hooks/usePagination";
import { useEffect, useState, useMemo } from "react";

interface MessageHistoryProps {
  messages: HyperlaneMessage[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function MessageHistory({
  messages,
  isLoading,
  onRefresh,
}: MessageHistoryProps) {
  const { toggleMessageExpansion, isMessageExpanded } = useMessageExpansion();
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "sent" | "received"
  >("all");

  const filteredMessages = useMemo(() => {
    if (historyFilter === "all") return messages;
    return messages.filter((msg) => msg.direction === historyFilter);
  }, [messages, historyFilter]);

  const pagination = usePagination({
    totalItems: filteredMessages.length,
    itemsPerPage: 5,
  });

  const paginatedMessages = pagination.getPaginatedItems(filteredMessages);

  useEffect(() => {
    pagination.reset();
  }, [historyFilter, pagination]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <MessageFilters
          currentFilter={historyFilter}
          onFilterChange={setHistoryFilter}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading message history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <MessageFilters
        currentFilter={historyFilter}
        onFilterChange={setHistoryFilter}
        onRefresh={onRefresh}
        isLoading={isLoading}
      />

      {filteredMessages.length > 0 ? (
        <>
          <div className="space-y-3">
            {paginatedMessages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                isExpanded={isMessageExpanded(message.id)}
                onToggleExpand={() => toggleMessageExpansion(message.id)}
              />
            ))}
          </div>

          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={filteredMessages.length}
            itemsPerPage={5}
            startIndex={pagination.startIndex}
            onPageChange={pagination.goToPage}
          />
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No {historyFilter !== "all" ? historyFilter : ""} messages yet</p>
          <p className="text-sm mt-1">
            {historyFilter === "all"
              ? "Send a message to get started!"
              : `No ${historyFilter} messages found`}
          </p>
        </div>
      )}
    </div>
  );
}
