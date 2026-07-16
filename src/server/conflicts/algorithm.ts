// Re-export utilities for backward compatibility
export * from "./helpers";

// Re-export main API from conflict-client (which uses helpers)
export { runConflictCheck, processQuery } from "./conflict-client";
