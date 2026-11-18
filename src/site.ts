/** Site-wide settings. Change these here, not in the page files. */
export const SITE = {
  // Always the full name. Never drop "Work" (a different TpT store is "The Primary Studio").
  name: 'The Primary Work Studio',
  tagline: 'Montessori shelf work',
  // No age range here or anywhere else in site-wide branding.
  intro:
    'Calm, hands-on printables for the Montessori shelf, made and classroom-tested by Revathi, a CDA-credentialed Montessori teacher.',
  url: 'https://theprimaryworkstudio.com',
  email: 'hello@theprimaryworkstudio.com',
  // Store front pages, shown in the footer. Leave '' to hide.
  storeLinks: {
    tpt: 'https://www.teacherspayteachers.com/store/the-primary-work-studio',
    etsy: '',
  },
  // How many days a product counts as "New" after its publishedDate.
  newForDays: 60,
} as const;

/** Optional features, switched with environment variables (see .env.example). */
export const FEATURES = {
  analyticsToken: (import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN as string | undefined) || '',
  showNewsletter: import.meta.env.PUBLIC_SHOW_NEWSLETTER === 'true',
};
