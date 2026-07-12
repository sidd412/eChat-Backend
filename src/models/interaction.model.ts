import { Schema, model, Document } from 'mongoose';

export interface IInteraction extends Document {
  userId: string;
  targetUserId: string;
  categories: string[]; // ['liked', 'added', 'consent']
  isBlocked: boolean;
  timestamp: number;
}

const InteractionSchema = new Schema<IInteraction>({
  userId: { type: String, required: true, index: true },
  targetUserId: { type: String, required: true, index: true },
  categories: { type: [String], default: [] },
  isBlocked: { type: Boolean, default: false },
  timestamp: { type: Number, default: () => Date.now() }
}, {
  collection: 'echat_interactions'
});

// Compound index to quickly check if an interaction already exists between A and B
InteractionSchema.index({ userId: 1, targetUserId: 1 }, { unique: true });

export const Interaction = model<IInteraction>('Interaction', InteractionSchema);
