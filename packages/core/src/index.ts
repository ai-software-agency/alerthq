// Domain types
export type { Severity, AlertDefinition } from './types/alert.js';
export type { SyncRun } from './types/sync-run.js';
export type { AlerthqConfig, StorageConfig, ProviderConfig, Context } from './types/config.js';

// Plugin interfaces
export type { ProviderAdapter, ProviderFactory, ProviderModule } from './interfaces/provider.js';
export type { StorageProvider, StorageFactory } from './interfaces/storage.js';

// Bootstrap
export { bootstrap } from './bootstrap.js';

// Core functions
export { sync } from './sync.js';
export type { SyncOptions } from './sync.js';
export { getAlerts, addManualAlert, removeManualAlert } from './alerts.js';
export type { ManualAlertInput } from './alerts.js';
export { getChanges } from './changes.js';
export type { ChangesResult } from './changes.js';
export { setTag, removeTag } from './tags.js';
export { testConnections } from './connections.js';
export type { ConnectionTestResult } from './connections.js';

// Utilities
export { withRetry } from './utils/retry.js';
export type { RetryOptions } from './utils/retry.js';
export { generateAlertId } from './utils/id.js';
export { hashConfig } from './utils/hash.js';
export { formatTable, formatCsv, formatJson } from './utils/format.js';
export { logger, setLogger } from './utils/logger.js';
export type { Logger, LogLevel } from './utils/logger.js';

// Config & plugin loaders (for advanced use / testing)
export { loadConfig, resolveEnvVars } from './loader/config-loader.js';
export { loadStoragePlugin, loadProviderPlugins } from './loader/plugin-loader.js';

// Validation schema
export { alerthqConfigSchema } from './validation/config-schema.js';

// Canonical data (single source of truth for docs, help, descriptions)
export { META, CLI_COMMANDS, generateHelpText, generateLlmHelp } from './canonical/index.js';
export type { CliCommand, CliOption } from './canonical/index.js';
