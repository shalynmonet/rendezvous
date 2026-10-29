import { describe, expect, it } from "vitest";
import { assertLifestyleDiscretion, conversationProfile, describeLifestyle, sharedTasteProfile } from "@/lib/lifestyle";

const profile = { name: "Private person", lifestyle: { alcohol: "Sober / in recovery", tobacco: "Trying to quit", cannabis: "Not around me, please", openToPartner: false } };
describe("Lifestyle privacy", () => {
  it("does not share alcohol, tobacco, 420 or partner preferences without explicit consent", () => {
    expect(sharedTasteProfile(profile)).toEqual({ name: "Private person" });
  });
  it("shares only the individual answer explicitly selected by its owner", () => {
    expect(sharedTasteProfile({ ...profile, lifestyle: { ...profile.lifestyle, shared: ["alcohol"] } })).toEqual({ name: "Private person", lifestyle: { alcohol: "Sober / in recovery" } });
  });
  it("excludes lifestyle from conversation inputs even after consent", () => {
    expect(conversationProfile({ ...profile, lifestyle: { ...profile.lifestyle, shared: ["alcohol"] } })).toEqual({ name: "Private person" });
  });
  it("derives discreet constraints without recovery status or attribution", () => {
    const constraints = describeLifestyle(profile.lifestyle);
    expect(constraints).toContain("offer alcohol-free drinks");
    expect(constraints).toContain("choose smoke-free settings");
    expect(constraints).not.toMatch(/Sober|recovery|Trying to quit|Private person|partner who/);
  });
  it("blocks direct disclosures but allows discreet mocktail recommendations", () => {
    expect(() => assertLifestyleDiscretion({ message: "Since you don't drink, I picked this bar." })).toThrow();
    expect(() => assertLifestyleDiscretion({ message: "Your sobriety makes this a perfect match." })).toThrow();
    expect(() => assertLifestyleDiscretion({ message: "Noor doesn't drink." })).toThrow();
    expect(() => assertLifestyleDiscretion({ message: "Ru picked a mocktail bar with live jazz." })).not.toThrow();
  });
});