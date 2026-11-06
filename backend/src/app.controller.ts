import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('users')
  async getUsers() {
    return await this.appService.getUsers();
  }

  @Get('sites/:address')
  async getSite(@Param('address') address: string) {
    return await this.appService.getSiteByAddress(address);
  }

  @Post('sites')
  async publishSite(@Body() body: { address: string; title: string; body: string; author: string }) {
    return await this.appService.createSite(body);
  }

  @Get('search')
  async search(@Query('q') q: string) {
    return await this.appService.searchSites(q);
  }

  @Get('history/:userId')
  async getHistory(@Param('userId') userId: string) {
    return await this.appService.getHistory(userId);
  }

  @Post('history')
  async recordVisit(@Body() body: { userId: string; address: string; navigationMethod: string }) {
    return await this.appService.recordVisit(body);
  }
}