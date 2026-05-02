import "@annotated/ui/styles.css";
import "./styles.css";
import { ClerkProvider, useAuth, useClerk } from "@clerk/react";
import { StrictMode, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { setAuthRedirectHandler, setAuthTokenProvider } from "./api";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ClerkBridge({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const clerk = useClerk();

  useEffect(() => {
    setAuthTokenProvider(async () => (isSignedIn ? await getToken() : null));
    setAuthRedirectHandler(async (_provider, returnTo) => {
      await clerk.redirectToSignIn({
        redirectUrl: returnTo,
        signUpFallbackRedirectUrl: returnTo,
        signInFallbackRedirectUrl: returnTo
      });
    });

    return () => {
      setAuthTokenProvider(null);
      setAuthRedirectHandler(null);
    };
  }, [clerk, getToken, isSignedIn]);

  return children;
}

const app = clerkPublishableKey ? (
  <ClerkProvider publishableKey={clerkPublishableKey}>
    <ClerkBridge>
      <App />
    </ClerkBridge>
  </ClerkProvider>
) : (
  <App />
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {app}
  </StrictMode>
);
