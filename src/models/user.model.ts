import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  gender?: string;
  age?: number;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  country?: string;
  coinsBalance: number;
  preferences: {
    gender: 'Male' | 'Female' | 'All';
    minAge: number;
    maxAge: number;
    filterType: 'km' | 'country';
    kmRadius: number;
  };
  isOnline: boolean;
  lastSeen: number;
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'Not Specified'], default: 'Not Specified' },
    age: { type: Number },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [0, 0]
      }
    },
    country: { type: String, default: 'Global' },
    coinsBalance: { type: Number, default: 100, required: true },
    preferences: {
      gender: { type: String, enum: ['Male', 'Female', 'All'], default: 'All' },
      minAge: { type: Number, default: 18 },
      maxAge: { type: Number, default: 99 },
      filterType: { type: String, enum: ['km', 'country'], default: 'country' },
      kmRadius: { type: Number, default: 50 }
    },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Number, default: () => Date.now() },
    fcmToken: { type: String }
  },
  {
    collection: 'echat_users',
    timestamps: true
  }
);

// Create 2dsphere index for geolocation queries
UserSchema.index({ location: '2dsphere' });

export const User = model<IUser>('User', UserSchema);
