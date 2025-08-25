import { FlatList, RefreshControl, View } from "react-native";
import { Text } from "@/components/Text";
import { Link } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { useState, useEffect } from "react";
import { ChatRoom } from "@/utils/types";

// Dummy data
const DUMMY_CHAT_ROOMS: ChatRoom[] = [
  {
    id: "1",
    title: "Chat Room 1",
    description: "Chat Room 1 Description",
    isPrivate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    title: "Chat Room 2",
    description: "Chat Room 2 Description",
    isPrivate: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    title: "Chat Room 3",
    description: "Chat Room 3 Description",
    isPrivate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function Index() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

console.log(APPWRITE_PROJECT_ID); // 68ac5aa4000cb19f4e2a


  useEffect(() => {
    fetchChatRooms();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchChatRooms();
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchChatRooms = async () => {
    // Simply set the dummy data
    setChatRooms(DUMMY_CHAT_ROOMS);
  };

  return (
    <FlatList
      data={chatRooms}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      renderItem={({ item }) => (
        <Link
          href={{
            pathname: "/[chat]",
            params: { chat: item.id },
          }}
        >
          <View
            style={{
              gap: 6,
              padding: 16,
              width: "100%",
              borderRadius: 16,
              alignItems: "center",
              flexDirection: "row",
              backgroundColor: "#262626",
              justifyContent: "space-between",
            }}
          >
            <ItemTitleAndDescription
              title={item.title}
              description={item.description}
              isPrivate={item.isPrivate}
            />
            <IconSymbol name="chevron.right" size={20} color="#666666" />
          </View>
        </Link>
      )}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: 16,
        gap: 16,
      }}
    />
  );
}

function ItemTitle({
  title,
  isPrivate,
}: {
  title: string;
  isPrivate: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Text style={{ fontSize: 17 }}>{title}</Text>
      {isPrivate && <IconSymbol name="lock.fill" size={20} color="#666666" />}
    </View>
  );
}

function ItemTitleAndDescription({
  title,
  description,
  isPrivate,
}: {
  title: string;
  description: string;
  isPrivate: boolean;
}) {
  return (
    <View style={{ gap: 4 }}>
      <ItemTitle title={title} isPrivate={isPrivate} />
      <Text style={{ fontSize: 13, color: "#666666" }}>{description}</Text>
    </View>
  );
}
