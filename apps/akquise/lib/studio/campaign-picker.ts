/** When no company is selected, users may pick any available campaign. */
export function campaignsForSelection<T extends { customerId?: string | null }>(
  campaigns: T[],
  customerId: string,
): T[] {
  return customerId
    ? campaigns.filter((campaign) => campaign.customerId === customerId)
    : campaigns;
}
