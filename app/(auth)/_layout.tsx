  import { ClerkLoaded, useUser } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";

  export default function RootLayout() {

    const {isSignedIn}=useUser();

    return (
    <ClerkLoaded>
      {isSignedIn ? (
        <Redirect href="../(chat)" />
      ) : (
        <Stack >
          <Stack.Screen name="index" options={{headerShown:false}}/>
        </Stack>  
      )}
    </ClerkLoaded>
    );
  }
