export function registerBaseAddon(db: any): void {
  // Register system tables, /_meta/* endpoints, health check
  console.log("Base addon registered");
}

export const systemModels = [
  "users",
  "settings",
  "health_check",
];
