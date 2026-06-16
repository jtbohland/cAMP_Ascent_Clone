import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { executeApi } from "@/lib/executeApi.js";

export type Viewer = {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin?: boolean;
};

type ViewerContextType = {
  viewer: Viewer | null;
  setViewer: (viewer: Viewer) => void;
  logout: () => void;
  isLoading: boolean;
};

const ViewerContext = createContext<ViewerContextType | undefined>(undefined);

const STORAGE_KEY = "cliptracker_viewer";

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewerState] = useState<Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try auto-lookup using Superblocks session email (ctx.user.email)
  // Falls back to localStorage if auto-lookup returns null
  useEffect(() => {
    let cancelled = false;

    async function autoRecognize() {
      try {
        // First, try server-side auto-lookup using the Superblocks JWT email
        const result = await executeApi("AutoLookupViewer", {}) as any;
        if (!cancelled && result?.viewer) {
          const v: Viewer = {
            id: result.viewer.id,
            email: result.viewer.email,
            name: result.viewer.name,
            role: result.viewer.role,
            isAdmin: result.viewer.isAdmin ?? false,
          };
          setViewerState(v);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
          setIsLoading(false);
          return;
        }
      } catch (e) {
        // Auto-lookup failed (e.g., API not available yet) — fall through to localStorage
      }

      // Fallback: check localStorage
      if (!cancelled) {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as Viewer;
            setViewerState(parsed);

            // Refresh from DB to pick up isAdmin changes
            executeApi("LookupViewer", { email: parsed.email })
              .then((lookupResult: any) => {
                if (!cancelled && lookupResult?.viewer) {
                  const refreshed: Viewer = {
                    id: lookupResult.viewer.id,
                    email: lookupResult.viewer.email,
                    name: lookupResult.viewer.name,
                    role: lookupResult.viewer.role,
                    isAdmin: lookupResult.viewer.isAdmin ?? false,
                  };
                  setViewerState(refreshed);
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
                }
              })
              .catch(() => { /* ignore — stale local data is fine */ });
          }
        } catch (e) {
          // ignore parse errors
        }
        setIsLoading(false);
      }
    }

    autoRecognize();
    return () => { cancelled = true; };
  }, []);

  const setViewer = useCallback((v: Viewer) => {
    setViewerState(v);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  }, []);

  const logout = useCallback(() => {
    setViewerState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ViewerContext.Provider value={{ viewer, setViewer, logout, isLoading }}>
      {children}
    </ViewerContext.Provider>
  );
}

export function useViewer() {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used within ViewerProvider");
  return ctx;
}
