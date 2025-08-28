interface ChatRoom {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions?: any[];
  $databaseId?: string;
  $collectionId?: string;
  title: string;
  description: string;
}
interface Message {
  $id?: string;
  $createdAt?: string;
  $updatedAt?: string;
  $collectionId?: string;
  $databaseId?: string;
  $permissions?: any[];
  content: string; // text content or media data URL
  senderId: string;
  senderName: string;
  senderPhoto: string;
  chatRoomId: string;
  type: 'text' | 'image' | 'audio';
}


interface User {
  id: string;
  fullName: string;
  email: string;
  imageUrl: string;
}

export type { ChatRoom, Message, User };
