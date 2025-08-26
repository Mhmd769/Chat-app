import { FlatList, RefreshControl, View } from "react-native";
import { Text } from "@/components/Text";
import { Link } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { useState, useEffect } from "react";
import { ChatRoom } from "@/utils/types";
import { appwriteConfig, db } from "@/utils/appwrite";
import { Query } from "appwrite";

export default function Index() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    try {
      const { documents } = await db.listDocuments(
        appwriteConfig.db,
        appwriteConfig.col.chatrooms,
        [Query.limit(100)]
      );

      // ✅ map Appwrite docs to your ChatRoom interface
      const mapped = documents.map((doc: any): ChatRoom => ({
        $id: doc.$id,
        $createdAt: doc.$createdAt,
        $updatedAt: doc.$updatedAt,
        $permissions: doc.$permissions,
        $databaseId: doc.$databaseId,
        $collectionId: doc.$collectionId,
        title: doc.title ?? "Untitled",
        description: doc.description ?? "",
      }));

      setChatRooms(mapped);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
    }
  };

  return (
    <FlatList
      data={chatRooms}
      keyExtractor={(item) => item.$id}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      renderItem={({ item }) => (
        <Link
          href={{
            pathname: "/[chat]",
            params: { chat: item.$id },
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

function ItemTitle({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Text style={{ fontSize: 17 }}>{title}</Text>
    </View>
  );
}

function ItemTitleAndDescription({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <ItemTitle title={title} />
      <Text style={{ fontSize: 13, color: "#666666" }}>{description}</Text>
    </View>
  );
}
