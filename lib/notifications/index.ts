export type {
  IntelligenceNotification,
  IntelligencePriorityScore,
  IntelligenceSource,
  IntelligenceKind,
  PlatformStatsSnapshot,
  AdminBroadcastInput,
  BroadcastCategory,
  SmartNotification,
  NotificationPriority,
} from "./types";
export {
  MIN_CONFIDENCE,
  ROTATE_MS,
  SMART_BAR_HEIGHT_PX,
  STATS_CACHE_TTL_MS,
  PRIORITY_ORDER,
  scoreToLegacyPriority,
} from "./types";
export { runIntelligenceEngine, scoreAndRank, selectDisplayQueue } from "./engine";
export type { IntelligenceEngineResult } from "./engine";
export { formatTimeAgo, countUnread, toDisplayItem } from "./service";
export { useSmartNotifications, useNotificationRotation } from "./hooks";
export { createBroadcastNotification } from "./broadcasts";
export { recordIntelligenceSeen, getIntelligenceHistory } from "./engine/history";
