/**
 * Master Config for Token Costs and Gamification Rewards
 * Update prices here to reflect across the entire application instantly.
 */

export const TOKEN_COSTS = {
  // 💎 Premium / High-Compute Features
  CAREER_HACKER: 20,
  FLOWCHART_GEN: 15,
  LAB_GRAPH: 15,
  CONCEPT_BATTLE: 10,
  CALENDAR_SYNC: 10,
  MIND_MAP_GEN: 15,
  MIND_MAP_CHAT: 5,
  STORY_GEN: 15,
  PROBLEM_SOLVER: 10,
  QUIZ_GEN: 5,
  NIGHT_BEFORE: 5,
  ORACLE_PREDICT: 20,
  PODCAST_GEN: 15,
  PRESENTATION_GEN: 15,
  LOGICFLOW_GEN: 15,
  WALLPAPER_GEN: 15,
  UNIVERSE_GEN: 15,
  TIMELINE_GEN: 15,
  PANIC_MODE_UNLOCK: 20,
  NOTES_PURIFIER: 15,
  YOUTUBE_DECODER: 15,
  SYLLABUS_GEN: 10,
  GEO_MAPPER_GEN: 15,
  MOLECULE_INSIGHT: 15,
  
  // ⚡ Medium / Low-Compute Features
  FLASHCARDS: 5,
  BIONIC_READER: 5,
  GEO_MAPPER: 5,
  BOOK_JUMPER: 5,
  AI_CHAT: 2,
  LIVE_CHAT: 2,
  
  // 🆓 Free Core Features (0 Tokens)
  FOCUS_ISLAND: 0,
  BATTLE_ARENA_JOIN: 0, // Joining is free, hosting might cost
  BATTLE_ARENA_HOST: 10,
  
  // 🔒 Security Limits
  FREE_USER_WEEKLY_FILE_LIMIT: 3,
  
  // 🎟️ User Tier Limits
  FREE_USER_INITIAL_TOKENS: 300,
  PRO_USER_TOKENS: 10000,
};

export const REWARDS = {
  // 💧 Daily Drip System
  DAILY_DRIP: 30, 
  
  // 🔥 Streak Bonuses
  STREAK_BONUS_3_DAYS: 50,
  STREAK_BONUS_7_DAYS: 150,
  
  // 🎯 Bounties & Loops
  PROFILE_COMPLETED: 100,
  REFERRAL_SENDER: 50,
  REFERRAL_RECEIVER: 30,
};

// Safety utility to dynamically fetch cost
export const getFeatureCost = (featureName: keyof typeof TOKEN_COSTS): number => {
  return TOKEN_COSTS[featureName] || 0;
};












// export const TOKEN_COSTS = {
//   CAREER_HACKER: 20,
//   CONCEPT_BATTLE: 10,
//   FLOWCHART_GEN: 15,
//   BIONIC_READER: 5,
//   FOCUS_ISLAND: 0, // Free
// };

// export const REWARDS = {
//   DAILY_LOGIN: 30,
//   PROFILE_COMPLETED: 100,
//   REFERRAL_BONUS_SENDER: 200,
//   REFERRAL_BONUS_RECEIVER: 100,
// };
