# Privacy notes for deployments

Astral Reverie has no accounts, checkout, payment API, advertising SDK, or user-generated text. Simulator progress is stored in the visitor's browser under the `astral-reverie-v2` local-storage namespace. The in-app reset action removes that saved state.

## Optional Google Analytics 4

Google Analytics is disabled unless a deployer configures a valid `GA_MEASUREMENT_ID`.

When configured, this implementation:

- does not initialize in `?dev=1` mode;
- respects browser Do Not Track and Global Privacy Control signals by not loading the Google tag;
- initializes Consent Mode v2 with analytics and advertising storage denied;
- disables Google signals and advertising-personalization signals;
- removes query parameters from the recorded page location, so seeds, debug flags, and shared-pull tokens are not sent as page URLs;
- sends only bounded interaction metadata such as view name, pull count, best rarity, aggregate rarity counts, simulated top-up tier, and share type;
- never sends a seed, card name, card ID, shared-pull token, fictional balance, or would-be spend value.

With storage denied, Google may still receive cookieless measurement pings and standard device/network information. Each deployer is responsible for an appropriate privacy notice, consent mechanism, retention policy, and regional configuration for their audience. This repository does not claim that enabling GA4 alone is legally compliant in every jurisdiction.

## Shared pull links

A shared result URL contains a versioned allowlist of opened card IDs. Opening it renders a read-only copy and does not change the recipient's balance, pity, ownership, or history. Treat a shared URL as public once posted.

Forks and deployments should replace this document with their operator identity and contact method before launch.
