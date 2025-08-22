import { Request, Response, NextFunction } from 'express';
import SettingsService from './settings.service';
import { PatchMeSettingsSchema, PutNotificationPrefSchema, SectionParamSchema, CategoryParamSchema, SocialConnectSchema, ProviderParamSchema } from './settings.dto';

export class SettingsController {
  // 5.1 Definitions
  async getDefinitions(req: Request, res: Response) {
    const data = await SettingsService.getDefinitions();
    res.json({ ok: true, data });
  }

  async getSection(req: Request, res: Response) {
    const { sectionKey } = SectionParamSchema.parse(req.params);
    const data = await SettingsService.getSectionByKey(sectionKey);
    res.json({ ok: true, data });
  }

  // 5.2 Me settings
  async getMe(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const data = await SettingsService.getResolvedForUser(userId);
    res.json({ ok: true, data });
  }

  async patchMe(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const body = PatchMeSettingsSchema.parse(req.body);
    await SettingsService.patchMeSettings(userId, body.updates);
    res.json({ ok: true, message: 'Settings updated.' });
  }

  // 5.3 Admin user settings
  async getUserSettings(req: Request, res: Response) {
    const { userId } = req.params;
    const data = await SettingsService.getResolvedForUser(userId);
    res.json({ ok: true, data });
  }

  async patchUserSettings(req: Request, res: Response) {
    const { userId } = req.params;
    const body = PatchMeSettingsSchema.parse(req.body);
    await SettingsService.patchMeSettings(userId, body.updates);
    res.json({ ok: true, message: 'User settings updated.' });
  }

  // 5.4 Notifications
  async getMyNotificationPrefs(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const data = await SettingsService.getNotificationPrefs(userId);
    res.json({ ok: true, data });
  }

  async putMyNotificationPref(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { category } = CategoryParamSchema.parse(req.params);
    const body = PutNotificationPrefSchema.parse(req.body);
    const data = await SettingsService.putNotificationPref(userId, category, body);
    res.json({ ok: true, message: 'Notification preference saved.', data });
  }

  async getUserNotificationPrefs(req: Request, res: Response) {
    const { userId } = req.params;
    const data = await SettingsService.getNotificationPrefs(userId);
    res.json({ ok: true, data });
  }

  async putUserNotificationPref(req: Request, res: Response) {
    const { userId } = req.params;
    const { category } = CategoryParamSchema.parse(req.params);
    const body = PutNotificationPrefSchema.parse(req.body);
    const data = await SettingsService.putNotificationPref(userId, category, body);
    res.json({ ok: true, message: 'Notification preference saved for user.', data });
  }

  // 5.5 Social accounts
  async listMySocial(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const data = await SettingsService.listSocialAccounts(userId);
    res.json({ ok: true, data });
  }

  async connectMySocial(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { provider } = ProviderParamSchema.parse(req.params);
    const body = SocialConnectSchema.parse(req.body);
    const data = await SettingsService.connectSocial(userId, provider, body);
    res.json({ ok: true, message: `${provider} connected.`, data });
  }

  async disconnectMySocial(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { provider } = ProviderParamSchema.parse(req.params);
    const data = await SettingsService.disconnectSocial(userId, provider);
    res.json({ ok: true, message: `${provider} disconnected.` });
  }
}

export default new SettingsController();
