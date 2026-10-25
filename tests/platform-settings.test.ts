import { describe, it, expect } from "vitest";
import {
  getPlatformSettingsAsync,
  savePlatformSettingsAsync,
  getPlatformSettings,
} from "../app/lib/platform-settings";

describe("Platform Settings (Drizzle SQLite Engine)", () => {
  it("loads default settings from SQLite or seeds automatically", async () => {
    const settings = await getPlatformSettingsAsync();
    expect(settings).toBeDefined();
    expect(settings.platformTitle).toBeDefined();
    expect(typeof settings.mainnetBaseFeeSol).toBe("number");
    expect(typeof settings.absorbNetworkRent).toBe("boolean");
  });

  it("updates and persists settings into SQLite", async () => {
    const testTitle = `Test Studio ${Date.now()}`;
    const updated = await savePlatformSettingsAsync({
      platformTitle: testTitle,
      mainnetBaseFeeSol: 0.25,
    });

    expect(updated.platformTitle).toBe(testTitle);
    expect(updated.mainnetBaseFeeSol).toBe(0.25);

    // Re-query directly from SQLite
    const reloaded = await getPlatformSettingsAsync();
    expect(reloaded.platformTitle).toBe(testTitle);
    expect(reloaded.mainnetBaseFeeSol).toBe(0.25);
  });

  it("supports synchronous fallback access without throwing", () => {
    const syncSettings = getPlatformSettings();
    expect(syncSettings).toBeDefined();
    expect(syncSettings.platformTitle).toBeDefined();
  });
});
