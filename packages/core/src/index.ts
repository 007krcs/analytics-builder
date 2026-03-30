// Types
export * from './types/index.js';

// Engine
export { AnalyticsEngine } from './engine/analytics-engine.js';
export type { AnalyticsEngineOptions, EngineState } from './engine/analytics-engine.js';

// Event bus
export { EventBus, globalEventBus } from './engine/event-bus.js';
export type { AnalyticsEventMap, EventName, EventPayload, EventHandler } from './engine/event-bus.js';

// Plugin marketplace
export { MARKETPLACE_PLUGINS, searchPlugins } from './plugin-marketplace.js';
export type { MarketplacePlugin } from './plugin-marketplace.js';
