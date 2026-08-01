import { Schema, model, Document } from 'mongoose';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Ensure the encryption key is exactly 32 bytes (256 bits)
const SECRET_KEY = (process.env.ENCRYPTION_KEY || 'supersecretencryptionkey123!@#45').substring(0, 32);
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  if (!text) return text;
  // If it's already encrypted (has the iv separator format), don't encrypt again
  if (text.includes(':') && text.split(':')[0].length === 32) {
    return text;
  }
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (e) {
    return text;
  }
}

export function decrypt(text: string): string {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    if (textParts.length < 2 || textParts[0].length !== 32) {
      return text; // Return raw text if not in encrypted format
    }
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return text; // Fallback to raw text if decryption fails
  }
}

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
  text: { 
    type: String, 
    required: true,
    get: decrypt,
    set: encrypt
  },
  timestamp: { type: Number, default: () => Date.now(), index: true },
  readStatus: { type: Boolean, default: false }
}, {
  collection: 'echat_messages',
  toJSON: { getters: true },
  toObject: { getters: true }
});

export const Message = model<IMessage>('Message', MessageSchema);
