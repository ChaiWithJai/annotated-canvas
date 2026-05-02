import "@annotated/ui/styles.css";
import "./sidepanel.css";
import { ClerkProvider, useAuth, useClerk } from "@clerk/chrome-extension";
import { StrictMode, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { SidePanel } from "./SidePanel";
import { setAuthRedirectHandler, setAuthTokenProvider } from "./api";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const syncHost = import.meta.env.VITE_CLERK_SYNC_HOST ?? "https://annotated-canvas.pages.dev";

function ClerkBridge({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const clerk = useClerk();

  useEffect(() => {
    setAuthTokenProvider(async () => (isSignedIn ? await getToken() : null));
    setAuthRedirectHandler(async () => {
      await clerk.redirectToSignIn({
        redirectUrl: chrome.runtime.getURL("sidepanel.html?auth=1")
      });
    });

    return () => {
      setAuthTokenProvider(null);
      setAuthRedirectHandler(null);
    };
  }, [clerk, getToken, isSignedIn]);

  return children;
}

const sidePanel = clerkPublishableKey ? (
  <ClerkProvider publishableKey={clerkPublishableKey} syncHost={syncHost}>
    <ClerkBridge>
      <SidePanel />
    </ClerkBridge>
  </ClerkProvider>
) : (
  <SidePanel />
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {sidePanel}
  </StrictMode>
);
