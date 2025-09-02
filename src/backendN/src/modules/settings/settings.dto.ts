import { z } from 'zod';

export const SettingValueSchema = z.union([
  z.boolean(),
  z.string(),
  z.array(z.string()),
  z.null(),
]);

export const PatchMeSettingsSchema = z.object({
  updates: z.array(z.object({
    itemId: z.string().uuid().optional(), // option 1: direct itemId
    itemKey: z.string().optional(),       // option 2: by itemKey
    value: SettingValueSchema,
  })).min(1),
});
export type PatchMeSettingsDTO = z.infer<typeof PatchMeSettingsSchema>;

export const PutNotificationPrefSchema = z.object({
  enabled: z.boolean().optional(),
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
});
export type PutNotificationPrefDTO = z.infer<typeof PutNotificationPrefSchema>;

export const SocialConnectSchema = z.object({
  handle: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(), // ISO string
  scopes: z.string().optional(),
});
export type SocialConnectDTO = z.infer<typeof SocialConnectSchema>;

export const SectionParamSchema = z.object({ sectionKey: z.string() });
export const ProviderParamSchema = z.object({ provider: z.enum(["instagram","spotify","youtube"]) });
