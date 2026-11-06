import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { Site } from './schemas/site.schema';
import { Visit } from './schemas/visit.schema';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Site.name) private siteModel: Model<Site>,
    @InjectModel(Visit.name) private visitModel: Model<Visit>,
  ) {}

  // 1. Get a specific site by address (e.g. tidepool.zz)
  async getSiteByAddress(address: string) {
    const site = await this.siteModel.findOne({ address: address.toLowerCase().trim() });
    if (!site) {
      throw new NotFoundException(`Site with address "${address}" not found.`);
    }
    return site;
  }

  // 2. Publish a new site
  async createSite(siteData: { address: string; title: string; body: string; author: string }) {
    const existing = await this.siteModel.findOne({ address: siteData.address.toLowerCase().trim() });
    if (existing) {
      // Overwrite or update if it already exists, or throw an error. Let's update/upsert!
      existing.title = siteData.title;
      existing.body = siteData.body;
      existing.author = siteData.author;
      return await existing.save();
    }
    
    const newSite = new this.siteModel({
      ...siteData,
      address: siteData.address.toLowerCase().trim(),
    });
    return await newSite.save();
  }

  // 3. Search sites across titles and bodies
  async searchSites(query: string) {
    if (!query) return [];
    // Using MongoDB text search index we defined in the schema
    return await this.siteModel.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
  }

  // 4. Get history for a specific user
  async getHistory(userId: string) {
    return await this.visitModel
      .find({ userId })
      .sort({ timestamp: -1 }) // Most recent visits first
      .limit(50);
  }

  // 5. Record a new visit
  async recordVisit(visitData: { userId: string; address: string; navigationMethod: string }) {
    const visit = new this.visitModel({
      userId: visitData.userId,
      address: visitData.address.toLowerCase().trim(),
      navigationMethod: visitData.navigationMethod,
      timestamp: new Date(),
    });
    return await visit.save();
  }
}