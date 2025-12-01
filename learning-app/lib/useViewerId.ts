"use client";

import { useState, useEffect } from "react";

/**
 * Hook to get/create an anonymous viewer ID stored in localStorage.
 * Used to track session progress without requiring user authentication.
 */
export function useViewerId(): string | null {
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem("viewerId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("viewerId", id);
    }
    setViewerId(id);
  }, []);

  return viewerId;
}
