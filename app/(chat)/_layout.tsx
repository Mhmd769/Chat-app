import { IconSymbol } from "@/components/IconSymbol";
import { ClerkLoaded, useUser } from "@clerk/clerk-expo";
import { HeaderTitle } from "@react-navigation/elements";
import { Link, Redirect, Stack } from "expo-router";
import { Image, View, StyleSheet } from "react-native";

export default function RootLayout() {
  const { isSignedIn } = useUser();
  const { user } = useUser();

  return (
    <ClerkLoaded>
      {isSignedIn ? (
        <Stack>
          <Stack.Screen 
            name="index" 
            options={{
              headerTitle: "Chat Rooms",
              headerLargeTitle: true,

              headerTitleStyle: {
                color: '#FFFFFF',
                fontSize: 28,
                fontWeight: '700',
              },
              headerLeft: (props) => (
                <Link href={"/profile"} style={styles.profileLink}>
                  <View>
                    <Image
                      source={{ uri: user?.imageUrl }}
                      style={styles.profileImage}
                    />
                    <View style={styles.statusIndicator} />
                  </View>
                </Link>
              ),
              headerRight: () => (
                <Link href={"/new-room"} style={styles.newRoomLink}>
                  <IconSymbol name="plus" color="#007AFF" size={24} />
                </Link>
              ),
            }}
          />
          <Stack.Screen 
            name="profile" 
            options={{ presentation: "modal" }}
          />
          <Stack.Screen 
            name="new-room" 
            options={{ presentation: "modal" , headerTitle:" New Chat Room",
              headerLeft:()=>(
                <Link dismissTo href={"/"}  >
                  <IconSymbol name="chevron.left" color="#007AFF" size={30} />
                </Link>
              )
            }}
          />
          <Stack.Screen
            name="[chat]"
            options={{
              headerTitle:""
            }}  
          />
          <Stack.Screen
            name="settings/[chat]"
            options={{
              headerTitle:" Room Settings",
              presentation: "modal",
            }}  
          />
        </Stack>
      ) : (
        <Redirect href="../(auth)" />
      )}
    </ClerkLoaded>
  );
}

const styles = StyleSheet.create({
  profileLink: {
    marginRight: 8,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  newRoomLink: {
    marginLeft: 8,
  },
   statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#10B981', // green
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});