import { describe, expect, it } from "vitest";
import { selectCouncilSiteTools } from "./council-tools";

describe("council site tools", () => {
  it("always provides every safe read-only tool", () => {
    expect(selectCouncilSiteTools("ما الأشياء التي يديرها الموقع حالياً؟")).toEqual([
      "site_capabilities",
      "ai_provider_status",
      "daily_public_feed",
      "privacy_safe_analytics",
    ]);
  });

  it("selects public daily headlines for feed questions", () => {
    expect(selectCouncilSiteTools("ما آخر منشورات اليوم؟")).toContain("daily_public_feed");
  });

  it("selects only privacy-safe analytics for traffic questions", () => {
    expect(selectCouncilSiteTools("كم عدد زيارات الموقع؟")).toContain("privacy_safe_analytics");
  });

  it("includes the complete snapshot even for unrelated questions", () => {
    expect(selectCouncilSiteTools("اقترح تطويراً للموقع")).toContain("privacy_safe_analytics");
  });
});
