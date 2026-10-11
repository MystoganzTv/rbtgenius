# App Review reply — sent September 14, 2026, 20:26 EDT

Submission: https://appstoreconnect.apple.com/apps/6766110248/distribution/reviewsubmissions/details/2217c394-ad82-4265-a4de-d60f19871de5

Hello App Review Team,

Thank you for flagging the concern under Guideline 5.6. We investigated the iOS purchase flow and compatible-device onboarding and have uploaded version 1.1.5, build 39, and selected it for the updated submission.

Changes in this build:
- iOS digital subscriptions use Apple In-App Purchase through StoreKit/RevenueCat. We removed the external checkout and billing portal fallback paths from the iOS implementation. If StoreKit products cannot load, the app shows an error and Retry rather than opening an external purchase page.
- We corrected onboarding to respond to the current window width, keep the carousel index within bounds, and allow vertical scrolling in shorter windows. Completion also proceeds if saving the onboarding flag fails.
- Restore previous purchase is available on the free-account paywall and, for existing Pro users, under More > Manage Subscription.

Verification completed on September 14, 2026:
- Demo account sign-in and completion of all four onboarding pages on an iPad simulator.
- A successful Apple TestFlight purchase on a physical iPhone 16 Pro using build 38, immediate Pro access, and retained access after relaunch.
- Restoration of that existing active purchase on the same iPhone in build 39, which displayed "Restored! Pro subscription restored." The no-active-subscription restore case was also tested.

The App Review notes include the navigation steps for checking these flows. Please review the corrected build 39. If the concern refers to another feature or behavior, please share the affected screen, device, and reproduction steps so we can investigate it specifically.

Thank you,
RBTGenius Team
