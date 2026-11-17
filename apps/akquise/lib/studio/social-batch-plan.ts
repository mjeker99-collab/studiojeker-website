/**
 * Recognise only explicitly numbered multi-area social requests.
 * Ambiguous tasks continue through GPT rather than receiving invented totals.
 * Planning never calls providers, queues mail or publishes social content.
 */
export type SocialBatchPlan = {
  areaCount: number;
  postsPerArea: number;
  totalPosts: number;
  channels: ("FACEBOOK" | "INSTAGRAM" | "LINKEDIN")[];
};

export function socialBatchPlan(message: string): SocialBatchPlan | null {
  const text = message.toLocaleLowerCase("de-CH");
  const areas = text.match(/\b(\d{1,2})\s+(?:servicebereich(?:e|en)|bereiche|themen)\b/);
  const perArea = text.match(/\b(?:je|jeweils)\s+(\d{1,2})\s+(?:social[\s-]?media[\s-]?)?(?:posts?|beitr(?:ä|ae)ge)\b/);
  if (!areas || !perArea) return null;

  const areaCount = Number(areas[1]);
  const postsPerArea = Number(perArea[1]);
  // Each existing series supports at most six posts. Prevent accidental
  // large or costly preparations and require an explicit manageable plan.
  if (areaCount < 2 || areaCount > 8 || postsPerArea < 1 ||
      postsPerArea > 6 || areaCount * postsPerArea > 48) return null;

  const channels: SocialBatchPlan["channels"] = [];
  if (/(?:^|\W)(?:facebook|fb|ffb)(?:$|\W)/i.test(text))
    channels.push("FACEBOOK");
  if (/(?:^|\W)(?:instagram|insta)(?:$|\W)/i.test(text))
    channels.push("INSTAGRAM");
  if (/(?:^|\W)linkedin(?:$|\W)/i.test(text))
    channels.push("LINKEDIN");
  if (!channels.length) return null;

  return {
    areaCount,
    postsPerArea,
    totalPosts: areaCount * postsPerArea,
    channels,
  };
}
