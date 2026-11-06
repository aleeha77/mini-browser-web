import { AppController } from './app.controller';
import { AppService } from './app.service';
import { jest } from '@jest/globals';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    const appService = { getUsers: jest.fn().mockResolvedValue([]) } as unknown as AppService;
    appController = new AppController(appService);
  });

  describe('users', () => {
    it('returns users from the service', async () => {
      await expect(appController.getUsers()).resolves.toEqual([]);
    });
  });
});
