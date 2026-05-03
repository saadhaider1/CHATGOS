export interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline';
  lastSeen: Date;
}

export interface Message {
  _id?: string;
  sender: string | Partial<User>;
  recipient?: string;
  group?: string;
  content: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt?: Date;
  readBy?: string[];
}
