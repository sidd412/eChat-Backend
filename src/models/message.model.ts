import { Schema, model, Document } from 'mongoose';

export interface IMessage extends Document {
  messageId: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: number;
  readStatus: boolean;
}

const MessageSchema = new Schema<IMessage>({
  messageId: { type: String, required: true, unique: true, index: true },
  chatId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Number, default: () => Date.now(), index: true },
  readStatus: { type: Boolean, default: false }
}, {
  collection: 'echat_messages'
});

export const Message = model<IMessage>('Message', MessageSchema);
