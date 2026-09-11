# App Store screenshots — 1.1.3

Real in-app captures prepared for the English (U.S.) App Store localization.

- `en-US/iphone-6.9`: 1320 × 2868 px, RGB PNG, ordered 01–05.
- `en-US/ipad-13`: 2064 × 2752 px, RGB PNG, ordered 01–04.

The screenshots were captured from the 1.1.3 iOS build using an isolated
temporary demo account. The demo account and its generated activity were
deleted after capture.

## Marketing variants — these are the ones to upload

Run from the repository root:

    pip install pillow
    python3 mobile/scripts/build_store_screenshots.py --version 1.1.3

- `en-US/iphone-6.9-marketing/`: 5 screenshots.
- `en-US/ipad-13-marketing/`: 4 screenshots.

### Design rules — do not soften these

The first version of these used a pale blue gradient with thin dark text. It
was unreadable at the thumbnail size App Store search results actually render,
which is the only size that decides whether anyone taps. The rules now are:

1. **Solid saturated background**, a different colour per screenshot so the set
   reads as a sequence in the carousel. No pale gradients.
2. **White headline, heavy weight, two lines maximum**, carrying a concrete
   number wherever one exists (`1,100+ questions`, `85 questions. 90 minutes.`).
   Generic headlines like "all in one place" lose to competitors who state
   numbers.
3. **The capture bleeds off the bottom edge** and fades into the background, so
   the crop reads as deliberate instead of chopping a line of UI in half.

The variants use only currently shipping features and intentionally exclude the
retired AI Tutor.

### Claims used in the copy

- `1,100+ questions` — the bank holds 1,119 unique question IDs. Rounded down
  on purpose; do not raise this without recounting.
- `all 43 items` / `3rd Edition outline` — the app's task list matches the
  BACB RBT Test Content Outline (3rd ed.), verified item by item.
- `85 questions. 90 minutes.` — matches the real exam format.

The previous generator (`build-store-screenshots.mjs`) is superseded: it needed
`sharp` resolved from a hardcoded path inside a local Codex runtime cache, so it
only ever ran on one machine. Safe to delete.
