import { Primary } from "@/assets/colors";
import { IconSymbol } from "@/components/IconSymbol";
import { Text } from "@/components/Text";
import { appwriteConfig, client, db } from "@/utils/appwrite";
import { ChatRoom, Message } from "@/utils/types";
import { useUser } from "@clerk/clerk-expo";
import { LegendList } from "@legendapp/list";
import { useHeaderHeight } from "@react-navigation/elements";
import { ID, Query } from "appwrite";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import * as React from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    TextInput,
      Keyboard,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatRoomScreen() {
  const { chat: chatRoomId } = useLocalSearchParams();
  const { user } = useUser();

  if (!chatRoomId) {
    return <Text>We couldn't find this chat room 🥲</Text>;
  }

  const [messageContent, setMessageContent] = React.useState("");
  const [chatRoom, setChatRoom] = React.useState<ChatRoom | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showScrollIndicator, setShowScrollIndicator] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  
  const headerHeight = Platform.OS === "ios" ? useHeaderHeight() : 0;
  const insets = useSafeAreaInsets();
  const textInputRef = React.useRef<TextInput>(null);
  const listRef = React.useRef<any>(null);
  const scrollIndicatorAnimation = React.useRef(new Animated.Value(0)).current;
  const pulseAnimation = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    handleFirstLoad();
  }, []);

  // Focus the text input when the component mounts
  React.useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, [isLoading]);

  // Subscribe to new/updated messages in this chat room
  React.useEffect(() => {
    const channel = `databases.${appwriteConfig.db}.collections.${appwriteConfig.col.messages}.documents`;

    const unsubscribe = client.subscribe(channel, (event) => {
      const payload = event?.payload as any;
      if (payload?.chatRoomId === chatRoomId) {
        console.log("message list updated for chat", chatRoomId);
        
        // Check if user is not at bottom when new message arrives
        if (!isAtBottom && payload?.senderId !== user?.id) {
          setUnreadCount(prev => prev + 1);
          showScrollToBottomIndicator();
        }
        
        getMessages();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [chatRoomId, isAtBottom]);

  const showScrollToBottomIndicator = () => {
    setShowScrollIndicator(true);
    
    // Animate the indicator appearing
    Animated.spring(scrollIndicatorAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();

    // Pulse animation for attention
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const hideScrollToBottomIndicator = () => {
    Animated.timing(scrollIndicatorAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowScrollIndicator(false);
      setUnreadCount(0);
    });
    pulseAnimation.stopAnimation();
    pulseAnimation.setValue(1);
  };

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollToEnd({ animated: true });
      hideScrollToBottomIndicator();
      setIsAtBottom(true);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isScrolledToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    
    setIsAtBottom(isScrolledToBottom);
    
    if (isScrolledToBottom && showScrollIndicator) {
      hideScrollToBottomIndicator();
    }
  };

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
      const { documents, total } = await db.listDocuments(
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
      
      // Auto-scroll to bottom when user sends a message
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error(error);
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: chatRoom?.title,
          headerRight: () => (
            <Link
              href={{
                pathname: "/settings/[chat]",
                params: { chat: chatRoomId as string },
              }}
            >
              <IconSymbol name="gearshape" size={24} color={Primary} />
            </Link>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={"padding"}
          keyboardVerticalOffset={headerHeight}
        >
          <LegendList
            data={messages}
            renderItem={({ item }) => {
              const isSender = item.senderId === user?.id;
              return (
                <View
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    flexDirection: "row",
                    alignItems: "flex-end",
                    gap: 6,
                    maxWidth: "80%",
                    alignSelf: isSender ? "flex-end" : "flex-start",
                  }}
                >
                  {!isSender && (
                    <Image
                      source={{ uri: item.senderPhoto }}
                      style={{ width: 30, height: 30, borderRadius: 15 }}
                    />
                  )}
                  <View
                    style={{
                      backgroundColor: isSender ? "#007AFF" : "#161616",
                      flex: 1,
                      padding: 10,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontWeight: "500", marginBottom: 4 }}>
                      {item.senderName}
                    </Text>
                    <Text>{item.content}</Text>
                    <Text
                      style={{
                        fontSize: 10,
                        textAlign: "right",
                      }}
                    >
                      {new Date(item.$createdAt!).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              );
            }}
            keyExtractor={(item) => item?.$id ?? "unknown"}
            contentContainerStyle={{ padding: 10 }}
            recycleItems={true}
            initialScrollIndex={messages.length - 1}
            alignItemsAtEnd // Aligns to the end of the screen, so if there's only a few items there will be enough padding at the top to make them appear to be at the bottom.
            maintainScrollAtEnd // prop will check if you are already scrolled to the bottom when data changes, and if so it keeps you scrolled to the bottom.
            maintainScrollAtEndThreshold={0.5} // prop will check if you are already scrolled to the bottom when data changes, and if so it keeps you scrolled to the bottom.
            maintainVisibleContentPosition //Automatically adjust item positions when items are added/removed/resized above the viewport so that there is no shift in the visible content.
            estimatedItemSize={100} // estimated height of the item
            // getEstimatedItemSize={(info) => { // use if items are different known sizes
            //   console.log("info", info);
            // }}
          />
          <View
            style={{
              borderWidth: 1,
              borderColor: '#333',
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 100,
              marginBottom: 6,
              marginHorizontal: 10,
            }}
          >
            <TextInput
              ref={textInputRef}
              placeholder="Type a message"
              style={{
                minHeight: 40,
                color: "white",
                flexShrink: 1, // prevent pushing the send button out of the screen
                flexGrow: 1, // allow the text input to grow keeping the send button to the right
                padding: 10,
              }}
              placeholderTextColor={"gray"}
              multiline
              value={messageContent}
              onChangeText={setMessageContent}
            />
            <Pressable
              style={{
                width: 50,
                height: 50,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={handleSendMessage}
            >
              <IconSymbol
                name="paperplane"
                size={24}
                color={messageContent ? Primary : "gray"}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}