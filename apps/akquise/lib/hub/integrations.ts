// Future adapters must preserve version-bound approvals and separate remote receipts.
// V1 deliberately has no implementation that makes an outbound request.
export type MarketingIntegration =
  "LINKEDIN" | "INSTAGRAM" | "FACEBOOK" | "MAILCHIMP";
export type RemoteReceipt = {
  externalId: string;
  url?: string;
  confirmedAt: string;
};
export interface FutureMarketingAdapter {
  integration: MarketingIntegration;
  publishApprovedVersion(input: {
    contentId: string;
    version: number;
    hash: string;
  }): Promise<RemoteReceipt>;
}
export const marketingConnections = {
  linkedin: "NOT_CONNECTED",
  instagram: "NOT_CONNECTED",
  facebook: "NOT_CONNECTED",
  mailchimp: "NOT_CONNECTED",
} as const;
