import { View, Image, TouchableOpacity } from "react-native";
import { Text } from "@/components/Text";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Button } from "@/components/Buttons";

export default function Profile() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const passkeysSupported = (global as any).ClerkExpoPasskeys?.isSupported 
    ? true 
    : false;

  const passkeys = passkeysSupported ? user?.passkeys ?? [] : [];

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)");
  };

  return (
    <View style={{ flex: 1, alignItems: "center", gap: 16, padding: 16 }}>
      <Image
        source={{ uri: user?.imageUrl }}
        style={{ width: 100, height: 100, borderRadius: 50 }}
      />
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>
          {user?.fullName}
        </Text>
        <Text style={{ fontSize: 16, color: "gray" }}>
          {user?.emailAddresses[0].emailAddress}
        </Text>
      </View>

      <Button onPress={handleSignOut}>Sign Out</Button>

      {passkeysSupported && (
        <View style={{ width: "100%", gap: 16, marginTop: 32 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold" }}>Passkeys</Text>
          {passkeys.length === 0 && (
            <Text style={{ fontSize: 16, color: "gray" }}>No passkeys found</Text>
          )}
          {passkeys.map((passkey) => (
            <View key={passkey.id}>
              <Text>ID: <Text style={{ color: "gray" }}>{passkey.id}</Text></Text>
              <Text>Name: <Text style={{ color: "gray" }}>{passkey.name}</Text></Text>
              <Text>Created: <Text style={{ color: "gray" }}>{passkey.createdAt.toDateString()}</Text></Text>
              <Text>Last Used: <Text style={{ color: "gray" }}>{passkey.lastUsedAt?.toDateString()}</Text></Text>
              <TouchableOpacity onPress={() => passkey.delete()}>
                <Text style={{ color: "red" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
          <Button
            onPress={async () => {
              try {
                await user?.createPasskey();
                console.log("Passkey created");
              } catch (error) {
                console.error(error);
              }
            }}
          >
            Add Passkey
          </Button>
        </View>
      )}
    </View>
  );
}
