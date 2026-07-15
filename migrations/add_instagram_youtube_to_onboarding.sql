ALTER TABLE onboarding_surveys ADD COLUMN IF NOT EXISTS instagram_link TEXT;
ALTER TABLE onboarding_surveys ADD COLUMN IF NOT EXISTS youtube_link TEXT;
ALTER TABLE onboarding_surveys ADD COLUMN IF NOT EXISTS monetization_models TEXT[];
ALTER TABLE onboarding_surveys ADD COLUMN IF NOT EXISTS weekly_time TEXT;
