import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SiteDocument = Site & Document;

@Schema({ timestamps: true })
export class Site {
  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  address: string; 

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string; 

  @Prop({ required: true, trim: true })
  author: string; 
}

export const SiteSchema = SchemaFactory.createForClass(Site);

SiteSchema.index({ title: 'text', body: 'text' });