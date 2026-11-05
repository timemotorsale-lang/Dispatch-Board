"use client";
import { useEffect, useRef } from "react";
import { readFormsLibraryRequest } from "@/lib/forms-library-navigation";

// Called only inside the loaded deal's execution desk. Opening never generates or prints.
export function useFormsLibraryEntry(draftId: string, onOpen: (ids: string[] | null) => void) {
  const opened = useRef(false), callback = useRef(onOpen);
  useEffect(() => { callback.current = onOpen; });
  useEffect(() => {
    if (opened.current) return;
    const timer = setTimeout(() => {
      const request = readFormsLibraryRequest(new URLSearchParams(window.location.search), draftId);
      if (!request) return;
      opened.current = true; callback.current(request.ids);
    }, 0);
    return () => clearTimeout(timer);
  }, [draftId]);
}
