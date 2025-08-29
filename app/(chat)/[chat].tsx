import { IconSymbol } from "@/components/IconSymbol";
import { Text } from "@/components/Text";
import { generateAIReply } from "@/utils/ai";
import { appwriteConfig, client, db, storage } from "@/utils/appwrite";
import { ChatRoom, Message } from "@/utils/types";
import { useUser } from "@clerk/clerk-expo";
import { LegendList } from "@legendapp/list";
import { useHeaderHeight } from "@react-navigation/elements";
import { ID, Query } from "appwrite";
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StatusBar,
    TextInput,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ChatRoomScreen() {
  const { chat: chatRoomId } = useLocalSearchParams();
  const { user } = useUser();
  const router = useRouter();

  if (!chatRoomId) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#0B141B' 
      }}>
        <Text style={{ color: '#8696A0' }}>We couldn't find this chat room 🥲</Text>
      </View>
    );
  }

  const [messageContent, setMessageContent] = React.useState("");
  const [chatRoom, setChatRoom] = React.useState<ChatRoom | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showScrollIndicator, setShowScrollIndicator] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  
  // Media states
  const [isRecording, setIsRecording] = React.useState(false);
  const [recording, setRecording] = React.useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const [showMediaOptions, setShowMediaOptions] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  
  const headerHeight = Platform.OS === "ios" ? useHeaderHeight() : 0;
  const insets = useSafeAreaInsets();
  const textInputRef = React.useRef<TextInput>(null);
  const listRef = React.useRef<any>(null);
  const scrollIndicatorAnimation = React.useRef(new Animated.Value(0)).current;
  const pulseAnimation = React.useRef(new Animated.Value(1)).current;
  const recordingTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = React.useRef<Audio.Sound | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [messageMenuFor, setMessageMenuFor] = React.useState<string | null>(null);
  const [showMentions, setShowMentions] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState("");

  React.useEffect(() => {
    handleFirstLoad();
    requestPermissions();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: audioStatus } = await Audio.requestPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaLibraryStatus !== 'granted' || audioStatus !== 'granted') {
      Alert.alert('Permissions needed', 'This app needs camera, media library, and microphone permissions to work properly.');
    }
  };

  React.useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, [isLoading]);

  React.useEffect(() => {
    const channels = [
      `databases.${appwriteConfig.db}.collections.${appwriteConfig.col.messages}.documents`
    ];

    const unsubscribe = client.subscribe(channels, (event) => {
      const payload = event?.payload as any;
      if (payload?.chatRoomId === chatRoomId) {
        console.log("message list updated for chat", chatRoomId);
        
        setTimeout(() => {
          getMessages().then(() => {
            if (!isAtBottom && payload?.senderId !== user?.id) {
              setUnreadCount(prev => prev + 1);
              showScrollToBottomIndicator();
            } else {
              scrollToBottom();
            }
          });
        }, 100);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [chatRoomId, isAtBottom]);

  const showScrollToBottomIndicator = () => {
    setShowScrollIndicator(true);
    
    Animated.spring(scrollIndicatorAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();

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

  const confirmDeleteMessage = (message: Message) => {
    Alert.alert(
      'Delete message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage(message),
        },
      ]
    );
  };

  const deleteMessage = async (message: Message) => {
    try {
      if (!message.$id) return;
      // Delete associated media file if present
      if (message.type === 'imageUri' || message.type === 'audioUri') {
        const fileId = extractFileIdFromStorageUrl(message.content);
        if (fileId) {
          try {
            await storage.deleteFile(appwriteConfig.bucket!, fileId);
          } catch (e) {
            console.warn('Failed to delete storage file for message', fileId, e);
          }
        }
      }
      await db.deleteDocument(
        appwriteConfig.db,
        appwriteConfig.col.messages,
        message.$id
      );
      setMessages((prev) => prev.filter((m) => m.$id !== message.$id));
    } catch (error) {
      console.error('Failed to delete message', error);
      Alert.alert('Error', 'Failed to delete message. Please try again.');
    } finally {
      setMessageMenuFor(null);
    }
  };

  const extractFileIdFromStorageUrl = (url: string): string | null => {
    try {
      // Matches .../storage/buckets/{bucket}/files/{fileId}/(view|download)
      const match = url.match(/\/files\/([^\/\?]+)(?:[\/?]|$)/i);
      return match && match[1] ? match[1] : null;
    } catch {
      return null;
    }
  };

  const confirmDeleteRoom = () => {
    Alert.alert(
      'Delete chat',
      'Delete this chat and all messages (including media)?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteRoom },
      ]
    );
  };

  const handleDeleteRoom = async () => {
    try {
      // 1) Fetch messages in this room
      const { documents } = await db.listDocuments(
        appwriteConfig.db,
        appwriteConfig.col.messages,
        [Query.equal('chatRoomId', chatRoomId as string), Query.limit(100)]
      );

      // 2) Delete media files and message documents
      for (const msg of documents as unknown as Message[]) {
        if (msg.type === 'imageUri' || msg.type === 'audioUri') {
          const fileId = extractFileIdFromStorageUrl(msg.content);
          if (fileId) {
            try { await storage.deleteFile(appwriteConfig.bucket!, fileId); } catch {}
          }
        }
        try {
          if (msg.$id) {
            await db.deleteDocument(
              appwriteConfig.db,
              appwriteConfig.col.messages,
              msg.$id
            );
          }
        } catch {}
      }

      // 3) Delete the room itself
      await db.deleteDocument(
        appwriteConfig.db,
        appwriteConfig.col.chatrooms,
        chatRoomId as string
      );

      // 4) Navigate back to rooms list
      router.back();
    } catch (error) {
      console.error('Failed to delete chat room', error);
      Alert.alert('Error', 'Failed to delete chat room.');
    }
  };

  const uploadFile = async (uri: string, mediaType: 'image' | 'audio', mimeType?: string): Promise<string | null> => {
    try {
      const fileName = mediaType === 'image' ? `image_${Date.now()}.jpg` : `audio_${Date.now()}.m4a`;
      const type = mimeType || (mediaType === 'image' ? 'image/jpeg' : 'audio/m4a');

      console.log('Upload start', { uri, mediaType, type, fileName });

      let localUri = uri;
      if (!localUri.startsWith('file://')) {
        const target = `${FileSystem.cacheDirectory}${fileName}`;
        console.log('Downloading to cache', { from: uri, to: target });
        const dl = await FileSystem.downloadAsync(uri, target);
        localUri = dl.uri;
      }

      const info = await FileSystem.getInfoAsync(localUri);
      console.log('Local file info', info);
      if (!info.exists) {
        throw new Error(`Local file not found: ${localUri}`);
      }

      console.log('Creating file in Appwrite Storage (SDK)', { bucket: appwriteConfig.bucket, name: fileName, type });
      try {
        const uploaded = await storage.createFile(
          appwriteConfig.bucket!,
          ID.unique(),
          { uri: localUri, name: fileName, type } as any
        );
        if (mediaType === 'image') {
          return `${storage.getFileView(appwriteConfig.bucket!, uploaded.$id)}`;
        }
        return `${storage.getFileDownload(appwriteConfig.bucket!, uploaded.$id)}`;
      } catch (sdkErr: any) {
        console.warn('SDK upload failed, falling back to REST', sdkErr);
      }

      console.log('Creating file in Appwrite Storage (REST)', { endpoint: appwriteConfig.endpoint, bucket: appwriteConfig.bucket, project: appwriteConfig.projectId });
      const form = new FormData();
      form.append('fileId', 'unique()');
      form.append('file', { uri: localUri, name: fileName, type } as any);

      const res = await fetch(`${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucket}/files`, {
        method: 'POST',
        headers: {
          'X-Appwrite-Project': `${appwriteConfig.projectId}`,
        },
        body: form as any,
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('REST upload error', data);
        throw new Error(data?.message || 'Upload failed');
      }
      const fileId = data?.$id;
      console.log('REST upload success', { fileId });

      if (mediaType === 'image') {
        return `${storage.getFileView(appwriteConfig.bucket!, fileId)}`;
      }
      return `${storage.getFileDownload(appwriteConfig.bucket!, fileId)}`;
    } catch (error) {
      console.error('File processing error:', error);
      Alert.alert('Upload Error', 'Failed to process file. Please try again.');
      return null;
    }
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    setShowMediaOptions(false);
    
    try {
      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'] as any,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'] as any,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setIsUploading(true);
        const picked = result.assets[0] as any;
        const fileData = await uploadFile(picked.uri, 'image', picked.mimeType || 'image/jpeg');
        
        if (fileData) {
          await sendMediaMessage(fileData, 'image');
        }
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      setIsUploading(false);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Recording Error', 'Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      setIsRecording(false);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        setIsUploading(true);
        const fileData = await uploadFile(uri, 'audio', 'audio/m4a');
        
        if (fileData) {
          await sendMediaMessage(fileData, 'audio', recordingDuration);
        }
        setIsUploading(false);
      }
      
      setRecordingDuration(0);
    } catch (error) {
      console.error('Stop recording error:', error);
      setIsUploading(false);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
    }
  };

  const cancelRecording = async () => {
    if (recording) {
      setIsRecording(false);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setRecordingDuration(0);
    }
  };

  const sendMediaMessage = async (fileData: string, messageType: 'image' | 'audio', duration?: number) => {
    const message = {
      content: fileData,
      senderId: user?.id!,
      senderName: user?.fullName ?? "Anonymous",
      senderPhoto: user?.imageUrl ?? "",
      chatRoomId: chatRoomId as string,
      type: messageType === 'image' ? 'imageUri' : 'audioUri',
    } as any;

    try {
      await db.createDocument(
        appwriteConfig.db,
        appwriteConfig.col.messages,
        ID.unique(),
        message
      );
      
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  async function handleSendMessage() {
    if (messageContent.trim() === "") return;

    const message = {
      content: messageContent,
      senderId: user?.id!,
      senderName: user?.fullName ?? "Anonymous",
      senderPhoto: user?.imageUrl ?? "",
      chatRoomId: chatRoomId as string,
      type: "fileName",
    };

    try {
      await db.createDocument(
        appwriteConfig.db,
        appwriteConfig.col.messages,
        ID.unique(),
        message
      );
      setMessageContent("");
      
      setTimeout(() => scrollToBottom(), 100);
      // If message mentions @ai, generate a reply
      if (/(^|\s)@ai(\s|$)/i.test(message.content)) {
        triggerAIReply(message.content);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const handleChangeText = (text: string) => {
    setMessageContent(text);
    // Detect mention trigger at the end of the current input token
    // Matches last token like "@", "@a", "@ai"
    const match = text.match(/(^|\s)@([a-z0-9_]*)$/i);
    if (match) {
      setShowMentions(true);
      setMentionQuery(match[2]?.toLowerCase() ?? "");
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };

  const availableMentions = React.useMemo(() => {
    const base = [{ id: 'ai', label: 'AI Assistant', handle: 'ai' }];
    const q = mentionQuery.trim();
    if (!q) return base;
    return base.filter(x => x.handle.toLowerCase().startsWith(q));
  }, [mentionQuery]);

  const insertMention = (handle: string) => {
    // Replace the trailing mention token with the selected handle
    const replaced = messageContent.replace(/(@[a-z0-9_]*)$/i, `@${handle} `);
    setMessageContent(replaced);
    setShowMentions(false);
    setMentionQuery("");
    // re-focus input
    setTimeout(() => textInputRef.current?.focus(), 0);
  };

  const triggerAIReply = async (promptText: string) => {
    try {
      const cleaned = promptText.replace(/(^|\s)@ai(\s|$)/i, ' ').trim();
      const reply = await generateAIReply(cleaned, {
        systemPrompt:
          'You are a helpful chat assistant inside a mobile chat app. Keep replies concise. If asked about images or audio, describe in text only.',
        maxOutputTokens: 300,
        temperature: 0.6,
      });

const botMessage: Message = {
  content: reply,
  senderId: 'ai-bot',
  senderName: 'AI Assistant',
  senderPhoto: 'https://www.gravatar.com/avatar/?d=mp&f=y', // default profile pic
  chatRoomId: chatRoomId as string,
  type: 'fileName',
} as any;


      await db.createDocument(
        appwriteConfig.db,
        appwriteConfig.col.messages,
        ID.unique(),
        botMessage
      );
    } catch (e) {
      console.error('AI reply failed', e);
      Alert.alert('AI Error', 'Failed to generate AI reply.');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPauseAudio = async (uri: string, messageId: string) => {
    try {
      if (currentPlayingId === messageId && soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
          return;
        }
        if (status.isLoaded && !status.isPlaying) {
          await soundRef.current.playAsync();
          setIsPlaying(true);
          return;
        }
      }

      if (soundRef.current) {
        try { await soundRef.current.stopAsync(); } catch {}
        try { await soundRef.current.unloadAsync(); } catch {}
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      setCurrentPlayingId(messageId);
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setCurrentPlayingId(null);
          sound.unloadAsync().catch(() => {});
          if (soundRef.current === sound) {
            soundRef.current = null;
          }
        }
      });
    } catch (e) {
      console.error('Audio playback error', e);
      Alert.alert('Audio', 'Unable to play audio.');
    }
  };

  const renderMediaContent = (item: Message) => {
    if ((item.type === 'image' || item.type === 'imageUri') && item.content) {
      return (
        <Pressable 
          onPress={() => setSelectedImage(item.content!)} 
          style={{ 
            marginTop: 8,
            borderRadius: 12,
            overflow: 'hidden'
          }}
        >
          <Image
            source={{ uri: item.content }}
            style={{
              width: screenWidth * 0.6,
              height: 200,
              borderRadius: 12,
            }}
            resizeMode="cover"
          />
        </Pressable>
      );
    }
    
    if ((item.type === 'audio' || item.type === 'audioUri') && item.content) {
      const isCurrentlyPlaying = currentPlayingId === (item.$id || item.content) && isPlaying;
      
      return (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.1)',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 16,
          marginTop: 8,
          minWidth: 200,
        }}>
          <Pressable
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#25D366',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
            onPress={() => handlePlayPauseAudio(item.content!, item.$id || item.content)}
          >
            <IconSymbol 
              name={isCurrentlyPlaying ? "stop.fill" : "play.fill"} 
              size={14} 
              color="white" 
            />
          </Pressable>
          
          <View style={{ flex: 1 }}>
            <View style={{
              flexDirection: 'row',
              height: 24,
              alignItems: 'center',
              marginBottom: 4,
            }}>
              {/* Audio waveform representation */}
              {[...Array(30)].map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 3,
                    height: Math.random() * 16 + 4,
                    backgroundColor: isCurrentlyPlaying ? '#25D366' : 'rgba(255,255,255,0.6)',
                    marginRight: 1,
                    borderRadius: 1.5,
                  }}
                />
              ))}
            </View>
            <Text style={{ 
              fontSize: 12, 
              color: 'rgba(255,255,255,0.7)',
              fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto'
            }}>
              Voice message
            </Text>
          </View>
        </View>
      );
    }
    
    return null;
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center",
        backgroundColor: '#0B141B'
      }}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#1F2C34" barStyle="light-content" />
      <Stack.Screen
        options={{
          headerTitle: chatRoom?.title,
          headerStyle: {
            backgroundColor: '#1F2C34',
          },
          headerTitleStyle: {
            color: '#FFFFFF',
            fontWeight: '600',
          },
          headerTintColor: '#FFFFFF',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={confirmDeleteRoom} style={{ paddingHorizontal: 8 }}>
                <IconSymbol name="trash" size={20} color="#FF6B6B" />
              </Pressable>
              <Link
                href={{
                  pathname: "/settings/[chat]",
                  params: { chat: chatRoomId as string },
                }}
              >
                <IconSymbol name="ellipsis" size={24} color="#8696A0" />
              </Link>
            </View>
          ),
        }}
      />
      
      <View style={{ flex: 1, backgroundColor: '#0B141B' }}>
        {/* WhatsApp-style background pattern */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#0B141B',
          opacity: 0.1,
        }}>
          {/* You could add a subtle pattern image here */}
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={"padding"}
          keyboardVerticalOffset={headerHeight}
        >
          <LegendList
            ref={listRef}
            data={messages}
            renderItem={({ item }) => {
              const isSender = item.senderId === user?.id;
              return (
                <View style={{ paddingHorizontal: 16, marginVertical: 2 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-end",
                      justifyContent: isSender ? "flex-end" : "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    {!isSender && (
                      <Image
                        source={{ uri: item.senderPhoto }}
                        style={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: 16,
                          marginRight: 8,
                          marginBottom: 4
                        }}
                      />
                    )}
                    
                    <Pressable
                      style={{
                        backgroundColor: isSender ? '#005C4B' : '#1F2C34',
                        maxWidth: screenWidth * 0.75,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        // WhatsApp-style message tail
                        borderBottomRightRadius: isSender ? 4 : 12,
                        borderBottomLeftRadius: isSender ? 12 : 4,
                        // Shadow for depth
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                      onLongPress={() => {
                        if (isSender) {
                          setMessageMenuFor(item.$id || null);
                          confirmDeleteMessage(item);
                        }
                      }}
                    >
                      {!isSender && (
                        <Text style={{ 
                          fontSize: 13,
                          fontWeight: "600",
                          color: '#25D366',
                          marginBottom: 4,
                          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto'
                        }}>
                          {item.senderName}
                        </Text>
                      )}
                      
                      {(item.type === 'text' || item.type === 'fileName') && (
                        <Text style={{ 
                          fontSize: 16,
                          color: '#E9EDEF',
                          lineHeight: 22,
                          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto'
                        }}>
                          {item.content}
                        </Text>
                      )}
                      
                      {renderMediaContent(item)}
                      
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        marginTop: 4,
                      }}>
                        <Text
                          style={{
                            fontSize: 11,
                            color: '#8696A0',
                            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto'
                          }}
                        >
                          {formatMessageTime(item.$createdAt!)}
                        </Text>
                        {isSender && (
                          <View style={{ marginLeft: 4 }}>
                            <IconSymbol 
                              name="checkmark" 
                              size={14} 
                              color="#4FC3F7" 
                            />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  </View>
                </View>
              );
            }}
            keyExtractor={(item) => item?.$id ?? "unknown"}
            contentContainerStyle={{ paddingVertical: 8 }}
            recycleItems={true}
            initialScrollIndex={messages.length - 1}
            alignItemsAtEnd
            maintainScrollAtEnd
            maintainScrollAtEndThreshold={0.5}
            maintainVisibleContentPosition
            estimatedItemSize={120}
            onScroll={handleScroll}
            style={{ flex: 1 }}
          />
          
          {/* Scroll to bottom indicator */}
          {showScrollIndicator && (
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 80,
                right: 20,
                opacity: scrollIndicatorAnimation,
                transform: [{ scale: pulseAnimation }],
              }}
            >
              <Pressable
                onPress={scrollToBottom}
                style={{
                  backgroundColor: '#25D366',
                  borderRadius: 25,
                  width: 50,
                  height: 50,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <IconSymbol name="chevron.down" size={20} color="white" />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      backgroundColor: '#FF3B30',
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ 
                      color: 'white', 
                      fontSize: 12, 
                      fontWeight: 'bold',
                      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto'
                    }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          )}

          {/* Input area with recording overlay */}
          <View style={{ 
            backgroundColor: '#1F2C34',
            paddingHorizontal: 16,
            paddingVertical: 8,
            paddingBottom: Math.max(8, insets.bottom)
          }}>
            {/* Recording overlay */}
            {isRecording && (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 16,
                  right: 16,
                  height: 56,
                  backgroundColor: '#FF3B30',
                  borderRadius: 28,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  zIndex: 10,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <View style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: 'white',
                  marginRight: 12,
                }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ 
                    color: 'white', 
                    fontWeight: '600',
                    fontSize: 16,
                    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto'
                  }}>
                    {formatDuration(recordingDuration)}
                  </Text>
                </View>
                <Pressable
                  onPress={cancelRecording}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ 
                    color: 'white', 
                    fontWeight: '500',
                    fontSize: 14
                  }}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={stopRecording}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'white',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginLeft: 8,
                  }}
                >
                  <IconSymbol name="stop.fill" size={18} color="#FF3B30" />
                </Pressable>
              </View>
            )}
            
            {/* Upload indicator */}
            {isUploading && (
              <View style={{
                position: 'absolute',
                top: -40,
                left: 16,
                right: 16,
                backgroundColor: 'rgba(31, 44, 52, 0.95)',
                padding: 12,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                zIndex: 5,
              }}>
                <ActivityIndicator size="small" color="#25D366" />
                <Text style={{ 
                  marginLeft: 12, 
                  color: '#E9EDEF',
                  fontSize: 14,
                  fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto'
                }}>
                  Uploading...
                </Text>
              </View>
            )}
            
            {/* Regular input */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: '#2A3942',
                borderRadius: 28,
                minHeight: 56,
                paddingHorizontal: 4,
                opacity: isRecording ? 0.3 : 1,
              }}
            >
              <Pressable
                style={{
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 24,
                }}
                onPress={() => setShowMediaOptions(true)}
                disabled={isRecording}
              >
                <IconSymbol name="plus" size={24} color="#8696A0" />
              </Pressable>
              
              <TextInput
                ref={textInputRef}
                placeholder="Message"
                style={{
                  flex: 1,
                  color: "#E9EDEF",
                  fontSize: 16,
                  lineHeight: 22,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
                  maxHeight: 120,
                }}
                placeholderTextColor="#8696A0"
                multiline
                value={messageContent}
                onChangeText={handleChangeText}
                editable={!isRecording}
              />

              {showMentions && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 60,
                    left: 60,
                    right: 60,
                    backgroundColor: '#1F2C34',
                    borderRadius: 12,
                    paddingVertical: 8,
                    paddingHorizontal: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  {availableMentions.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => insertMention(m.handle)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: '#25D366',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                      }}>
                        <IconSymbol name="sparkles" size={14} color="#0B141B" />
                      </View>
                      <Text style={{ color: '#E9EDEF', fontSize: 15 }}>
                        @{m.handle} — {m.label}
                      </Text>
                    </Pressable>
                  ))}
                  {availableMentions.length === 0 && (
                    <View style={{ padding: 10 }}>
                      <Text style={{ color: '#8696A0' }}>No matches</Text>
                    </View>
                  )}
                </View>
              )}
              
              {messageContent.trim() ? (
                <Pressable
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 24,
                    backgroundColor: '#25D366',
                    marginRight: 4,
                  }}
                  onPress={handleSendMessage}
                  disabled={isRecording}
                >
                  <IconSymbol
                    name="arrow.up"
                    size={20}
                    color="white"
                  />
                </Pressable>
              ) : (
                <Pressable
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 24,
                  }}
                  onPress={startRecording}
                  disabled={isRecording}
                >
                  <IconSymbol
                    name="mic.fill"
                    size={24}
                    color="#25D366"
                  />
                </Pressable>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Media options modal */}
      <Modal
        visible={showMediaOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMediaOptions(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMediaOptions(false)}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'flex-end',
          }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={{
                backgroundColor: '#1F2C34',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingTop: 20,
                paddingHorizontal: 20,
                paddingBottom: Math.max(20, insets.bottom),
              }}>
                <View style={{
                  width: 40,
                  height: 4,
                  backgroundColor: '#8696A0',
                  borderRadius: 2,
                  alignSelf: 'center',
                  marginBottom: 20,
                }} />
                
                <Pressable
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    backgroundColor: '#2A3942',
                    borderRadius: 16,
                    marginBottom: 12,
                  }}
                  onPress={() => pickImage('camera')}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    backgroundColor: '#FF3B30',
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}>
                    <IconSymbol name="camera.fill" size={20} color="white" />
                  </View>
                  <Text style={{ 
                    color: '#E9EDEF', 
                    fontSize: 16,
                    fontWeight: '500',
                    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto'
                  }}>
                    Camera
                  </Text>
                </Pressable>
                
                <Pressable
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    backgroundColor: '#2A3942',
                    borderRadius: 16,
                    marginBottom: 12,
                  }}
                  onPress={() => pickImage('gallery')}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    backgroundColor: '#007AFF',
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}>
                    <IconSymbol name="photo.fill" size={20} color="white" />
                  </View>
                  <Text style={{ 
                    color: '#E9EDEF', 
                    fontSize: 16,
                    fontWeight: '500',
                    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto'
                  }}>
                    Photo & Video Library
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Image preview modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={{
          flex: 1,
          backgroundColor: '#000000',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <TouchableWithoutFeedback onPress={() => setSelectedImage(null)}>
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }} />
          </TouchableWithoutFeedback>
          
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={{
                width: screenWidth,
                height: screenHeight * 0.8,
              }}
              resizeMode="contain"
            />
          )}
          
          <Pressable
            onPress={() => setSelectedImage(null)}
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <IconSymbol name="xmark" size={20} color="white" />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}