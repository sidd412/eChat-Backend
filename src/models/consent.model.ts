import { Schema, model, Document } from 'mongoose';

export interface IConsent extends Document {
  senderId: string;
  receiverId: string;
  status: 'pending' | 'allowed' | 'denied';
  createdAt: number;
  updatedAt: number;
}

const ConsentSchema = new Schema<IConsent>({
  senderId: { type: String, required: true, index: true },
  receiverId: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'allowed', 'denied'], default: 'pending' },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() }
}, {
  collection: 'echat_consents'
});

// Ensure a unique pair of sender and receiver
ConsentSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

export const Consent = model<IConsent>('Consent', ConsentSchema);
