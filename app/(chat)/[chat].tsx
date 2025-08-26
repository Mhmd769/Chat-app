import { IconSymbol } from "@/components/IconSymbol";
import { Text } from "@/components/Text";
import { appwriteConfig, client, db } from "@/utils/appwrite";
import { ChatRoom, Message } from "@/utils/types";
import { useUser } from "@clerk/clerk-expo";
import { LegendList } from "@legendapp/list";
import { useHeaderHeight } from "@react-navigation/elements";
import { ID, Query } from "appwrite";
import { LinearGradient } from 'expo-linear-gradient';
import { Link, Stack, useLocalSearchParams } from "expo-router";
import * as React from "react";
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StatusBar,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatRoomScreen() {
  const { chat: chatRoomId } = useLocalSearchParams();
  const { user } = useUser();

  if (!chatRoomId) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center",
        backgroundColor: "#0a0a0a" 
      }}>
        <IconSymbol name="exclamationmark.triangle" size={48} color="#FF6B6B" />
        <Text style={{ marginTop: 16, fontSize: 18, color: "#FF6B6B" }}>
          We couldn't find this chat room 🥲
        </Text>
      </View>
    );
  }

  const [messageContent, setMessageContent] = React.useState("");
  const [chatRoom, setChatRoom] = React.useState<ChatRoom | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const headerHeight = Platform.OS === "ios" ? useHeaderHeight() : 0;
  const textInputRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    handleFirstLoad();
  }, []);

  // Keyboard handling for Android
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (Platform.OS === 'android') {
          setKeyboardHeight(e.endCoordinates.height);
        }
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (Platform.OS === 'android') {
          setKeyboardHeight(0);
        }
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Focus the text input when the component mounts
  React.useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, [isLoading]);

  // Subscribe to messages
  React.useEffect(() => {
    const channel = `databases.${appwriteConfig.db}.collections.${appwriteConfig.col.chatrooms}.documents.${chatRoomId}`;

    const unsubscribe = client.subscribe(channel, () => {
      console.log("chat room updated");
      getMessages();
    });

    return () => {
      unsubscribe();
    };
  }, [chatRoomId]);

  async function handleFirstLoad() {
    try {
      await getChatRoom();
      await getMessages();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function getChatRoom() {
    const document = await db.getDocument(
      appwriteConfig.db,
      appwriteConfig.col.chatrooms,
      chatRoomId as string
    );
    setChatRoom(document as unknown as ChatRoom);
  }

  async function getMessages() {
    try {
      const { documents } = await db.listDocuments(
        appwriteConfig.db,
        appwriteConfig.col.messages,
        [
          Query.equal("chatRoomId", chatRoomId),
          Query.limit(100),
          Query.orderDesc("$createdAt"),
        ]
      );

      documents.reverse();
      setMessages(documents as unknown as Message[]);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSendMessage() {
    if (messageContent.trim() === "") return;

    const message = {
      content: messageContent,
      senderId: user?.id!,
      senderName: user?.fullName ?? "Anonymous",
      senderPhoto: user?.imageUrl ?? "",
      chatRoomId: chatRoomId as string,
    };

    try {
      await db.createDocument(
        appwriteConfig.db,
        appwriteConfig.col.messages,
        ID.unique(),
        message
      );
      setMessageContent("");

      await db.updateDocument(
        appwriteConfig.db,
        appwriteConfig.col.chatrooms,
        chatRoomId as string,
        { $updatedAt: new Date().toISOString() }
      );
    } catch (error) {
      console.error(error);
    }
  }

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          padding: 30,
          borderRadius: 20,
          alignItems: 'center'
        }}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={{ marginTop: 16, color: '#4ECDC4', fontSize: 16 }}>
            Loading messages...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isSender = item.senderId === user?.id;
    
    return (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 12,
          maxWidth: "85%",
          alignSelf: isSender ? "flex-end" : "flex-start",
        }}
      >
        {!isSender && (
          <View style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            <Image
              source={{ uri: item.senderPhoto || 'https://via.placeholder.com/40' }}
              style={{ 
                width: 36, 
                height: 36, 
                borderRadius: 18,
                borderWidth: 2,
                borderColor: '#4ECDC4'
              }}
            />
          </View>
        )}
        <View
          style={{
            backgroundColor: isSender ? "#4ECDC4" : "#2d2d2d",
            flex: 1,
            padding: 12,
            borderRadius: 20,
            borderBottomRightRadius: isSender ? 4 : 20,
            borderBottomLeftRadius: isSender ? 20 : 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3.84,
            elevation: 3,
          }}
        >
          {!isSender && (
            <Text style={{ 
              fontWeight: "600", 
              marginBottom: 4,
              color: '#4ECDC4',
              fontSize: 12
            }}>
              {item.senderName}
            </Text>
          )}
          <Text style={{ 
            color: isSender ? "#000" : "#ffffff",
            fontSize: 16,
            lineHeight: 20
          }}>
            {item.content}
          </Text>
          <Text
            style={{
              fontSize: 11,
              textAlign: "right",
              marginTop: 6,
              color: isSender ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)",
            }}
          >
            {new Date(item.$createdAt!).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        {isSender && (
          <View style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            <Image
              source={{ uri: user?.imageUrl || 'https://via.placeholder.com/40' }}
              style={{ 
                width: 36, 
                height: 36, 
                borderRadius: 18,
                borderWidth: 2,
                borderColor: '#4ECDC4'
              }}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <Stack.Screen
        options={{
          headerTitle: chatRoom?.title,
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            color: '#4ECDC4',
          },
          headerRight: () => (
            <Link
              href={{
                pathname: "/settings/[chat]",
                params: { chat: chatRoomId as string },
              }}
            >
              <View style={{
                backgroundColor: 'rgba(78, 205, 196, 0.2)',
                padding: 8,
                borderRadius: 12,
              }}>
                <IconSymbol name="gearshape" size={20} color="#4ECDC4" />
              </View>
            </Link>
          ),
        }}
      />
<LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={{ flex: 1 }}>
  <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
    >
      <View style={{ flex: 1 }}>
        {/* Messages */}
        <LegendList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item?.$id ?? "unknown"}
          contentContainerStyle={{
            padding: 8,
            paddingBottom: Platform.OS === "android" ? keyboardHeight + 80 : 16, // Add extra for input
          }}
          style={{ flex: 1 }}
          recycleItems={true}
          initialScrollIndex={messages.length - 1}
          alignItemsAtEnd
          maintainScrollAtEnd
          maintainScrollAtEndThreshold={0.5}
          maintainVisibleContentPosition
          estimatedItemSize={120}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        <View
          style={{
            backgroundColor: 'rgba(45, 45, 45, 0.95)',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: 'rgba(78, 205, 196, 0.3)',
            paddingBottom: Platform.OS === "android" ? keyboardHeight : 0, // Push input above keyboard
          }}
        >
          <View
            style={{
              backgroundColor: '#2d2d2d',
              flexDirection: "row",
              alignItems: "flex-end",
              borderRadius: 25,
              borderWidth: 1,
              borderColor: '#4ECDC4',
              paddingHorizontal: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <TextInput
              ref={textInputRef}
              placeholder="Type a message..."
              style={{
                minHeight: 44,
                maxHeight: 120,
                color: "white",
                flex: 1,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
              }}
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
              value={messageContent}
              onChangeText={setMessageContent}
              textAlignVertical="center"
            />
            <Pressable
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: messageContent.trim() ? '#4ECDC4' : 'transparent',
                borderRadius: 22,
                margin: 4,
              }}
              onPress={handleSendMessage}
              disabled={!messageContent.trim()}
            >
              <IconSymbol
                name="paperplane.fill"
                size={20}
                color={messageContent.trim() ? "#000" : "rgba(255,255,255,0.3)"}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>
</LinearGradient>

    </>
  );
}