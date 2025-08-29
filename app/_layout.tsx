import { tokenCache } from "@/utils/cache";
import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Slot } from "expo-router";
import { StatusBar } from "react-native";
// Ensure no accidental web localStorage usage causes getItem undefined errors
// in React Native environments. Clerk uses the provided tokenCache so we don't
// need AsyncStorage directly here.

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  if (!publishableKey) {
    throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
  }

  // Disable Clerk passkeys globally (RN/Expo) unless native passkeys support is configured
  (global as any).ClerkExpoPasskeys = {
    isSupported: async () => false,
  };

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      __experimental_passkeys={{
        isSupported: () => false,
        isAutoFillSupported: async () => false,
        get: async () => {
          throw new Error('Passkeys disabled in this build');
        },
        create: async () => {
          throw new Error('Passkeys disabled in this build');
        },
      }}
    >
      <ClerkLoaded>
        <ThemeProvider value={DarkTheme}>
          <Slot />
          <StatusBar barStyle="light-content" backgroundColor={"black"} />
        </ThemeProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}