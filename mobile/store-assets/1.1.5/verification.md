# iOS 1.1.5 — build verification

Verified on September 14, 2026.

## Build and delivery

- Build 37 predates the reactive onboarding-width fix.
- Build 38 includes that fix, bounded carousel indexes, vertically scrollable
  slide content, recovery from onboarding storage failures, product-catalog
  retry, and purchase restoration independent of catalog availability.
- EAS build: https://expo.dev/accounts/mystodev/projects/rbt-genius/builds/b7bf6d4d-925b-4d4e-ac66-c228e0df49ef
- Successfully uploaded to App Store Connect. Follow-up inspection confirmed
  build 38 completed processing and is assigned to the internal Team (Expo)
  group. This is an upload for TestFlight, not an App Review submission.
- Submission: https://expo.dev/accounts/mystodev/projects/rbt-genius/submissions/be1acf0f-9c0b-4520-a5ac-b295fff40739

## Completed checks

- `npm test`: 58 passed, 0 failed. Screen tests use real React components with
  mocked native services; they do not validate Apple transactions.
- Release simulator build succeeded on Xcode 26.6.
- iPad Pro 13-inch (M4), iOS 26.5 simulator: Next traversed all four slides;
  Get Started opened login; terminating and relaunching preserved completion.
- Automated cases cover carousel bounds and width changes, failed onboarding
  storage writes, unavailable offerings followed by retry, and restore while
  offerings are unavailable.
- The generated iOS JavaScript bundle contains none of the web billing
  endpoints `/api/billing/checkout`, `/api/billing/portal`, or
  `/api/billing/confirm`.
- `git diff --check` passed.
- Follow-up simulator test: the user signed in with the demo account; the app
  displayed the Test user's dashboard and free plan. The paywall loaded monthly
  and yearly products ($19.99/month and $99.99/year), including the monthly trial.
  Starting a purchase opened Apple's account sign-in dialog. Canceling it
  returned to the paywall, and starting again reopened the dialog successfully.

## Physical iPhone — TestFlight purchase passed

- The user installed 1.1.5 (38) through TestFlight on the iPhone 16 Pro.
  Opening it preserved the existing Enrique account session and free plan.
- Restore before purchase displayed "Nothing found — No active subscription
  found for this Apple ID." The paywall remained usable.
- The monthly purchase opened Apple's TestFlight confirmation: one-week trial,
  then $19.99/month, with an explicit notice that this test purchase would not
  be charged. This used the iPhone's Apple account in TestFlight's test
  environment; it was not the separate named sandbox tester account.
- After the user entered the Apple account password directly into Apple's
  dialog, Apple displayed "Your purchase was successful."
- RBT Genius then displayed "Your free trial has started!" and changed the
  account badge from Free to Pro.
- The Exams tab displayed the unlocked 85-question, 90-minute mock exam with
  its Start Exam button. No exam was started or added to study history.
- At 19:24 local time, the app was terminated and relaunched on the physical
  device. The dashboard retained the signed-in session and "You're on Pro".
  This verifies access persistence through the app's session-refresh flow;
  individual backend webhook deliveries were not separately audited.

## Remaining review details and test limits

- Demo login succeeded in the simulator with credentials entered directly by
  the user. Before resubmission, visual inspection confirmed the demo sign-in
  and contact fields were filled and saved. Text/DOM extraction incorrectly
  returned empty values for those fields; it was not reliable evidence of
  missing credentials. TestFlight's separate Test Information page was not edited.
- Cancellation of automatic renewal was not exercised. The simulator check
  covers cancellation of the purchase authentication dialog, not subscription
  cancellation. Existing active purchase restoration passed in build 39 below.
- Native swipe and window-resizing behavior were not fully verified; resizing
  was exercised in component tests.
- Simulator sandbox authentication failed with `AMSErrorDomain Code=100` and
  underlying `Code=2`, "Password reuse not available for account". The physical
  TestFlight test above resolved the purchase-test blocker. Apple describes the
  simulator limitation here: https://developer.apple.com/forums/thread/768966

## Follow-up — restore an existing purchase

- Build 38 hides the subscription entry in More for Pro users, and its Pro
  screen has no Restore action. This prevents exercising restoration after a
  successful purchase using the same signed-in account.
- Build 39 adds a subscription entry in More for Pro users and exposes Restore
  on their subscription screen. It uses the existing RevenueCat restore handler
  and backend/session synchronization, with a disabled button and progress
  indicator while restoration runs.
- `npm test`: 60 passed, 0 failed. New component cases cover the Pro navigation
  entry and successful restore ordering: native restore result, backend sync,
  session refresh, success alert. These use mocks; physical verification is
  recorded below.
- EAS build: https://expo.dev/accounts/mystodev/projects/rbt-genius/builds/861a4529-e6c6-43ff-a60c-d6428825d1c5
- Build 39 finished successfully. TestFlight submission:
  https://expo.dev/accounts/mystodev/projects/rbt-genius/submissions/331d0b1b-2753-4b53-ae4b-e147cb436d6e
  (initially waiting in Expo's Free Tier Queue).

### Physical iPhone — existing purchase restoration passed

- At 20:20 local time on September 14, 2026, TestFlight showed version 1.1.5
  (39) installed with an Open button. App Store Connect reported processing
  state VALID and internal state IN_BETA_TESTING.
- Opening build 39 preserved the Enrique account session and Pro access from
  the earlier TestFlight purchase.
- More displayed the new Manage Subscription entry. Its Pro screen displayed
  Restore previous purchase.
- At 20:21, tapping Restore previous purchase completed and displayed
  "Restored! — Pro subscription restored." The app returned to More and the
  confirmation was dismissed successfully. No new purchase was initiated.
- This exercises the actual RevenueCat restore flow for the existing active
  TestFlight purchase on the same iPhone and app account. It does not cover
  recovery after deleting/reinstalling the app or moving to another device.

## App Review preparation and reply

- Updated the existing rejected version's metadata to 1.1.5, replaced selected
  build 36 with build 39, and saved updated What's New and App Review Notes.
- At 20:26 EDT on September 14, sent the response recorded in
  `app-review-reply.md`. App Store Connect displayed it as the second message
  in submission 2217c394-ad82-4265-a4de-d60f19871de5.
- Visually confirmed the demo username/password and contact phone/email were
  filled and saved. The initial automated approval rejection relied on incorrect
  empty values from text/DOM extraction; the retry was allowed after visual
  verification. No credentials have been copied into these files.
- At 20:30 EDT on September 14, 2026, completed Update Review and Resubmit to
  App Review. App Store Connect confirmed **Waiting for Review** for iOS App
  1.1.5, build 39, under submission 2217c394-ad82-4265-a4de-d60f19871de5.

## Local build note

The existing CocoaPods cache contained a Hermes compiler path from the old
project directory. `pod install` alone retained it. The successful local build
used the current compiler explicitly:

```sh
xcodebuild -workspace mobile/ios/RBTGenius.xcworkspace -scheme RBTGenius \
  -configuration Release -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=547CDF13-A8CD-4618-B038-FC384263A019' \
  -derivedDataPath /tmp/rbt-ipad-build CODE_SIGNING_ALLOWED=NO \
  HERMES_CLI_PATH="$PWD/mobile/node_modules/hermes-compiler/hermesc/osx-bin/hermesc"
```

The simulator uses local native version metadata; production build number 38
was assigned and verified by EAS using its remote version source.
