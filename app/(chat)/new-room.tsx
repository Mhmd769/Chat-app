import * as React from "react";
import { View, Switch, Button, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Input from "@/components/Input";
import { useState } from "react";
import { Text } from "@/components/Text";
import { Stack, router } from "expo-router";
import { appwriteConfig, db } from "@/utils/appwrite";
import { ID } from "appwrite";

export default function NewRoom() {
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function createRoom() {
    try {
      setIsLoading(true);
      const room = await db.createDocument(
        appwriteConfig.db,
        appwriteConfig.col.chatrooms,
        ID.unique(),
        {
          title: roomName,
          description: roomDescription,
        }
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      router.back();
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Create Room",
          headerStyle: {
            backgroundColor: "#1a1a1a",
          },
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            fontWeight: "600",
            fontSize: 18,
          },
          headerRight: () => (
            <TouchableOpacity
              style={[
                styles.createButton,
                {
                  backgroundColor: roomName.length === 0 || isLoading ? "#444444" : "#007AFF",
                  opacity: roomName.length === 0 || isLoading ? 0.6 : 1,
                }
              ]}
              onPress={createRoom}
              disabled={roomName.length === 0 || isLoading}
            >
              <Text style={styles.createButtonText}>
                {isLoading ? "Creating..." : "Create"}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>New Chat Room</Text>
            <Text style={styles.subtitle}>
              Create a space for conversations and collaboration
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Room Name</Text>
              <View style={styles.inputContainer}>
                <Input
                  placeholder="Enter room name..."
                  value={roomName}
                  onChangeText={setRoomName}
                  style={styles.input}
                  placeholderTextColor="#888888"
                />
              </View>
              <Text style={styles.inputHelper}>
                Choose a clear, descriptive name for your room
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <View style={styles.inputContainer}>
                <Input
                  placeholder="Describe what this room is for..."
                  value={roomDescription}
                  onChangeText={setRoomDescription}
                  multiline
                  numberOfLines={4}
                  maxLength={100}
                  style={[styles.input, styles.textArea]}
                  placeholderTextColor="#888888"
                />
              </View>
              <Text style={styles.inputHelper}>
                {roomDescription.length}/100 characters
              </Text>
            </View>
          </View>

          {/* Preview Section */}
          {(roomName || roomDescription) && (
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Preview</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.roomIcon}>
                    <Text style={styles.roomIconText}>#</Text>
                  </View>
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewRoomName}>
                      {roomName || "Room Name"}
                    </Text>
                    {roomDescription && (
                      <Text style={styles.previewDescription}>
                        {roomDescription}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#888888",
    lineHeight: 22,
  },
  formSection: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333333",
  },
  input: {
    backgroundColor: "transparent",
    color: "#ffffff",
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 0,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  inputHelper: {
    fontSize: 14,
    color: "#666666",
    marginTop: 6,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 4,
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  previewSection: {
    marginTop: 8,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333333",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  roomIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  roomIconText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  previewInfo: {
    flex: 1,
  },
  previewRoomName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 14,
    color: "#888888",
    lineHeight: 20,
  },
}); 