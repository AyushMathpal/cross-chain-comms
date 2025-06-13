"use client";

import { Send, Inbox, RefreshCw } from "lucide-react";

interface MessageFiltersProps {
  currentFilter: "all" | "sent" | "received";
  onFilterChange: (filter: "all" | "sent" | "received") => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function MessageFilters({
  currentFilter,
  onFilterChange,
  onRefresh,
  isLoading,
}: MessageFiltersProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Message History</h3>

      <div className="flex items-center space-x-3">
        <div className="flex bg-gray-100 rounded-md p-1">
          <button
            onClick={() => onFilterChange("all")}
            className={`px-3 py-1 text-sm rounded ${
              currentFilter === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange("sent")}
            className={`px-3 py-1 text-sm rounded flex items-center space-x-1 ${
              currentFilter === "sent"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Send className="h-3 w-3" />
            <span>Sent</span>
          </button>
          <button
            onClick={() => onFilterChange("received")}
            className={`px-3 py-1 text-sm rounded flex items-center space-x-1 ${
              currentFilter === "received"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Inbox className="h-3 w-3" />
            <span>Received</span>
          </button>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
          title="Refresh history"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}
