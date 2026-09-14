export const channelTypes = ["whatsapp", "instagram", "facebook"] as const;
export type ChannelType = (typeof channelTypes)[number];
export type ChannelStatus = "verified" | "connected" | "disconnected" | "error";
export interface PublicChannel {
  id: string;
  name: string;
  type: ChannelType;
  identifier: string;
  externalId: string;
  status: ChannelStatus;
  lastVerifiedAt: string | null;
  lastWebhookAt: string | null;
}
