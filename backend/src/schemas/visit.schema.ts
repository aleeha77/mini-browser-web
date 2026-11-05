import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VisitDocument = Visit & Document;

@Schema({ timestamps: true })
export class Visit {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId; 

  @Prop({ required: true, index: true })
  address: string;

  @Prop({ default: Date.now, required: true })
  timestamp: Date; 

  @Prop({ 
    required: true, 
    enum: ['typed', 'link', 'back', 'forward'], 
    type: String 
  })
  navigationMethod: string;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);