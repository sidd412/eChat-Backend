import { Schema, model, Document } from 'mongoose';

export interface IRequest extends Document {
  requestId: string;
  requesterId: string;
  requesterEmail?: string;
  type: 'account_deletion' | 'report_user' | 'support';
  targetId?: string;
  reason: string;
  status: 'created' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const RequestSchema = new Schema<IRequest>(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    requesterId: { type: String, required: true, index: true },
    requesterEmail: { type: String, default: '' },
    type: { 
      type: String, 
      enum: ['account_deletion', 'report_user', 'support'], 
      required: true 
    },
    targetId: { type: String },
    reason: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['created', 'completed'], 
      default: 'created', 
      required: true 
    }
  },
  {
    collection: 'echat_requests',
    timestamps: true
  }
);

export const Request = model<IRequest>('Request', RequestSchema);
