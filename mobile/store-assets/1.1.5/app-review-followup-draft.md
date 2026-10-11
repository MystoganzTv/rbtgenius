# Response to App Review — incorporated into review notes

Status: the technical details and reproduction request below were incorporated
into the App Review notes for build 40. Version 1.1.5 (40) was resubmitted on
September 19, 2026 at 12:24 PM EDT and is `Waiting for Review`. This text was not
sent as a separate message in Resolution Center.

Hello App Review Team,

Thank you for your September 17 feedback regarding Guideline 5.6 for
RBTGenius 1.1.5 (39), submission 2217c394-ad82-4265-a4de-d60f19871de5.
We want to reproduce and resolve the specific behavior you observed.

Could you please identify the feature or screen that appeared hidden, the device
and OS version, and the steps to reproduce it? Please also let us know whether
this occurred before or after purchasing or restoring a subscription. A
screenshot or recording would help us investigate the exact issue.

We inspected the actual build 39 artifact and confirmed that the previously
removed external subscription checkout, billing portal, and pricing fallback
routes are absent from its iOS JavaScript bundle. In the authentication,
navigation, and subscription code we reviewed, we found no reviewer-specific
feature switches.

During our investigation, we separately reproduced and corrected these access
problems, with fixes included in replacement build 40:

- A failed or delayed dashboard response could display an active Pro account as
  Free or overwrite newly activated Pro access.
- Purchase or restore success could be displayed before the server confirmed
  access. The app now checks that confirmation and offers an activation retry
  without starting another purchase.
- A purchase could begin before RevenueCat finished identifying the signed-in
  account. Purchases now wait for that identification to succeed.
- A restore connection failure could incorrectly appear as no purchase history.

Automated regression tests pass, and the corrected native app builds and loads
Apple subscription products on an iPad simulator. A replacement version 1.1.5,
build 40, has been uploaded, processed by Apple, and is available for internal
testing in TestFlight.
On September 19, we opened build 40 from TestFlight on a physical iPhone using
an existing Pro account. Restore reported "Pro subscription restored," and we
could then open Analytics and the Mock Exam start screen. Access was retained
after switching back from TestFlight. We also signed out of the Pro account,
signed into an existing Free test account, and returned to the original Pro
account. Each account displayed its own progress and plan. Mock exams remained
locked for Free and were accessible again for Pro, without another purchase.
A new purchase from a Free account and cold-launch persistence remain pending.
These fixes are not in build 39 currently selected for App Review. We
are not assuming these bugs explain your Guideline 5.6 finding.

For reference, the feature paths are Dashboard, Practice, Exams, and
More > Flashcards / Analytics / Profile. Free accounts access subscriptions and
Restore through More > Upgrade; Pro accounts use More > Manage Subscription.
Mock exams require an active subscription. The Free test account could open
Analytics and view its own performance statistics.

Thank you for helping us identify the specific remaining concern.

RBTGenius Team
