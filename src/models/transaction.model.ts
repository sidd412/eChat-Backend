import { Schema, model, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: string;
  orderId: string;
  amount: number;
  coins: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  gatewayResponse?: any;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    coins: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
    gatewayResponse: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);
