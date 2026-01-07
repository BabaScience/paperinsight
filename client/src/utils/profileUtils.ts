import type { UserProfile } from '@/stores/profileStore';

/**
 * Checks if a user profile is complete by verifying all required fields are present.
 * Required fields: researchField, expertiseLevel, preferredStyle, preferredLanguage, preferredModel
 * 
 * @param profile - The user profile to check
 * @returns true if all required fields have values, false otherwise
 */
export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) {
    return false;
  }

  // Check all required fields are present and have values
  const hasResearchField = !!profile.researchField && profile.researchField.trim().length > 0;
  const hasExpertiseLevel = !!profile.expertiseLevel;
  const hasPreferredStyle = !!profile.preferredStyle;
  const hasPreferredLanguage = !!profile.preferredLanguage && profile.preferredLanguage.trim().length > 0;
  const hasPreferredModel = !!profile.preferredModel;

  return (
    hasResearchField &&
    hasExpertiseLevel &&
    hasPreferredStyle &&
    hasPreferredLanguage &&
    hasPreferredModel
  );
}


