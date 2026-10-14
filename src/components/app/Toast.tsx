"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle2 } from "lucide-react";

const ToastContext = createContext<(message: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((next: string) => {
    setMessage(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3800);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {message && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-6 z-[70] mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2.5 rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-white shadow-lift"
        >
          <CheckCircle2 className="size-[18px] shrink-0 text-jade-300" aria-hidden />
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
