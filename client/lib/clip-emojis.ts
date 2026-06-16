/**
 * Emoji map for cAMP Ascent clip days.
 * Used across Library, Watch page, and Ranger Report for visual continuity.
 */
export const CLIP_EMOJIS: Record<number, string> = {
  1: "🔎",  // Day 1: Ideal Customer Profiles
  2: "📥",  // Day 2: Top of Funnel (TOFU) – MQLs & Inbounds
  3: "📈",  // Day 3: GTM Launch Pad (SFDC Sales Dashboard)
  4: "📇",  // Day 4: Prospecting Process
  5: "🐦‍🔥", // Day 5: Renewal Operations
  6: "🥊",  // Day 6: The Competitive Landscape
  7: "🩺",  // Day 7: Account Planning Best Practices
  8: "🏎️",  // Day 8: Discovery That Accelerates
  9: "💰",  // Day 9: Pricing & Packaging 101
  10: "🪢", // Day 10: Leveraging Partners
  11: "☂️",  // Day 11: Forecasting (including Services)
  12: "📖", // Day 12: Customer Stories
  13: "📑", // Day 13: Contract Lifecycle Management
  14: "🤝", // Day 14: Deal Desk & CPQ
  15: "🪢", // Day 15: Leveraging Solution Engineers & Professional Services
  16: "🪢", // Day 15 (cont): SE Partnership & Platform Overview
  17: "🪢", // Day 15 (cont): Why Sell Services & Services Forecasting
};

/**
 * Get the emoji for a clip by sort order, with a fallback.
 */
export function getClipEmoji(sortOrder: number): string {
  return CLIP_EMOJIS[sortOrder] ?? "🎬";
}
