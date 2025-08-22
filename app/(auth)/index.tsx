import * as React from "react";
import { View, Image, SafeAreaView } from "react-native";

import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import {
  isClerkAPIResponseError,
  useSignIn,
  useSSO,
  useUser,
} from "@clerk/clerk-expo";
import { ClerkAPIError } from "@clerk/types";
import { Text } from "@/components/Text";
import { Button } from "@/components/Buttons";

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession();

export default function Index() {
  const { startSSOFlow } = useSSO();
  const { user, isSignedIn } = useUser();
  const { signIn, setActive } = useSignIn();
  const [errors, setErrors] = React.useState<ClerkAPIError[]>([]);

  const handleSignInWithGoogle = React.useCallback(async () => {
    try {
      const { createdSessionId, setActive, signIn, signUp } =
        await startSSOFlow({
          strategy: "oauth_google",
          redirectUrl: AuthSession.makeRedirectUri(),
        });

      if (createdSessionId) {
        setActive!({ session: createdSessionId });
      } else {
        // If there is no `createdSessionId`,
        // there are missing requirements, such as MFA
        // Use the `signIn` or `signUp` returned from `startSSOFlow`
        // to handle next steps
      }
    } catch (err) {
      if (isClerkAPIResponseError(err)) setErrors(err.errors);
      console.error(JSON.stringify(err, null, 2));
    }
  }, []);

  const signInWithPasskey = async () => {
    try {
      const signInAttempt = await signIn?.authenticateWithPasskey({
        flow: "discoverable",
      });

      if (signInAttempt?.status === "complete") {
        if (setActive !== undefined) {
          await setActive({ session: signInAttempt.createdSessionId });
        }
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      console.error("Error:", JSON.stringify(err, null, 2));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* spacer */}
      <View style={{ flex: 0.1 }} />

      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View style={{ gap: 20, alignItems: "center" }}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={{ width: 100, height: 100 }}
          />
          <Text style={{ fontSize: 32, fontWeight: "bold" }}>
            Modern Chat App
          </Text>
          <Text>Sign in to continue</Text>
          {errors.map((error) => (
            <Text key={error.code}>{error.code}</Text>
          ))}
        </View>

        {/* spacer */}
        <View style={{ flex: 1 }} />
        <Button
          onPress={signInWithPasskey}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 20,
            backgroundColor: "black",
            borderColor: "white",
            borderWidth: 1,
          }}
        >
          <Text style={{ color: "white", fontWeight: "500" }}>
            Sign in with Passkey
          </Text>
        </Button>
        <Button
          onPress={handleSignInWithGoogle}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 30,
          }}
        >
          <Image
            source={require("@/assets/images/google-icon.png")}
            style={{ width: 20, height: 20 }}
          />
          <Text style={{ color: "black", fontWeight: "500" }}>
            Sign in with Google
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}