# Our Little Journey

A playful, romantic website with interactive 3D penguins and cinematic video backgrounds.

- Explore three places, share gentle conversations, and customize your penguin.
- Read a personal letter, listen to music, and capture a penguin selfie.
- Download or share a memory card with the moments and answers you choose.
- Choose silk bows, rose blooms, tiny tiaras, pearls, ribbons, or heart clips.
- A cool teal-and-cream palette, earthy floating ground, and a pink female penguin.
- Clear pearl jewelry, bounded walking, and solid body/wing separation across selfie poses.
- Smooth section entrances, background crossfades, and an animated portal passage.
- Distinct rose garden, lantern grove, and constellation scenery.
- Responsive layouts, keyboard controls, and reduced-motion support.

## Run locally

Install Node.js, then run from the repository root:

```sh
node serve.cjs
```

Open http://127.0.0.1:3000 in your browser. No package installation or build step is required.

## Host the website

Publish the contents of `site/` with any static web host. The included scripts, Three.js library, posters, and optimized videos use relative paths.

## Personalize

Edit `draftLetter` and `draftMessage` near the top of `site/app.js` to change the default letter and closing message. Visitors can also edit the words in the site's settings; those edits are saved only in their browser.

## Privacy

Journey answers and progress stay in the current browser tab's `sessionStorage`. Motion preferences and edited letter/message text use `localStorage`. There is no backend or analytics service. A downloaded or shared memory card includes the answers the visitor chose to give; sharing happens only when the visitor chooses it.

## The living world

The doorway opens into five connected places with softened terrain, rounded foliage, and joined paths: a forest entrance, flower garden, wooden lantern bridge, moonlit lake with a bench, and a final soil terrace that recalls the flowers, lanterns and stars discovered earlier. Movement follows the connecting paths, while horizontal drags gently change the camera. Tap the world to walk, or use the left and right arrow keys. Flowers, lanterns, ripples, stars, notes, and the male penguin have large tap targets and equivalent buttons.

Distance is one saved preference throughout the journey. A hug, kiss, or hand-holding moment temporarily approaches, then returns to that preference; selfie contact poses hold until another pose is chosen. The shoulder-rooted flippers bend through the gesture. The existing story, optional answers, accessories, films, sound toggle, editable letter, selfie, and memory card remain available.

World detail adapts to device capability and sustained frame time, with an optional Low/Medium/High setting. Low detail disables shadow maps, retains soft contact shadows under the penguins, caps pixel ratio at 1, and reduces particles, glow layers and environmental motion. Static environment meshes use instancing; only the current and nearby places are built, with a maximum of three cached locations. Gentler motion pauses the films, skips camera orbiting, and uses direct location changes.

## Checks

Run `npm test` for persistent distance, smooth contact release, path joins and unobstructed bench approach checks. Run `npm run test:world`, then open http://127.0.0.1:4187 to check animated body clearance, flipper vertices, shoulder attachment, safe bounds, bench-seat clearance, camera framing at five viewport sizes, restart cleanup, scene caching, and low-quality settings. The page renders a pose gallery and reports the sampled-frame results.

The complete story, skipped/answered questions, environmental controls, settings, selfie capture, and memory card have been checked in Chromium, including portrait and landscape viewport layouts. This is browser emulation; physical iOS/Safari and Android hardware have not been verified.

## Credits

The three background videos were supplied by the project owner and optimized for this experience. Three.js is included under its MIT license; see `site/LICENSES.txt`.

## October polish pass

Ordinary conversation reactions preserve personal space. Accepted hugs have a lead-in, hold and return; interrupted gestures separate smoothly. Selfie-to-memory transitions retain the selected pose and image. Back navigation is available at the memory card, restores the correct chapter and location, and returns to the top. Closing consent choices returns to the walk without adding a repeated question to the history.

Restart clears environmental discoveries, camera gestures, reaction and walking state, pending interactions, answers, photos and generated card URLs. Async photo/card results from an older journey are discarded. Sound, motion, world-detail preferences and personalized words are retained.

The audio bed continues between locations with gradual filter changes. Discovery chimes are short and limited; chords cannot stack. Sound fades down while the page is hidden. On leaving the page, audio and rendering resources are released.

Validation: ten Node tests and 16,380 sampled animation frames passed, including no sampled body penetration or bench-seat intersection. Full mobile journey checked at 390×844, with narrow portrait and landscape layout checks. The generated and downloaded memory PNG was verified at 1500×4421 pixels. Hardware Safari/iOS and Android GPU performance remain unverified.

## Walking and arrival update

The penguins now take alternating steps with planted support feet, independent torso waddling, gentle foot lifts and opposite flipper swings. Steps follow actual distance traveled. Each path starts softly, maintains a comfortable pace, brakes to its exact landing and allows a brief turn at corners. Personal distance adjustments remain smooth during travel.

Forward and backward transitions retain the departure floor until the pair arrives. Quick location choices finish the current safe path before following the latest route. Camera presets blend along the path. The doorway shows the letter only after both penguins have arrived, lowered their feet and turned toward the visitor. Interaction and selfie pose requests made during travel wait for arrival. On mobile, a location choice scrolls back to the world so the walk stays visible.

Validation: 13 Node tests pass, including exact arrivals at 120/60/30/10 frames per second, speed bounds, alternating foot lifts and stable support footprints. The expanded browser geometry checks passed over 32,000 sampled frames, including every forward/backward route at all three tested distances, one arrival notification per trip, safe loaded walking surfaces, doorway completion, deferred contact, and the existing pose/bench/mobile-camera checks. Mobile doorway entry and rapid route changes were also exercised through the actual interface without overflow or console errors.

## Doorway handoff

Automatic arrival, the Continue button and Escape use one short covered fade into the letter scene. The outgoing doorway stays visible until the fade covers it; the penguins, resting feet and camera are prepared underneath before the incoming scene is revealed. The doorway caption remains visible throughout the walk. Repeated Continue/arrival events share one handoff, and restart/page cleanup cancels it without reopening an old chapter. Gentler motion uses a shorter fade.

Validation: all 16 Node tests pass, including cover-before-swap ordering, repeated triggers and cancellation during a scene change. Automatic arrival, early Continue and gentler motion were checked in the actual desktop interface. Geometry checks also verify that an early exit lands at the entrance with the camera ready, feet at rest, and both penguins facing forward at all three distances. Existing mobile camera checks pass; mobile handoff input and physical phone hardware are not verified.

## Compact penguin steps

Walking uses shorter alternating strides with a bounded ankle reach during turns and personal-space changes, keeping the little feet beneath the body. Leg attachments sit lower inside the torso, and seated feet tuck closer in.

Both penguins' leg meshes are hidden in every scene and pose, including walking and selfie captures. Only the body and little feet are visible.

Validation: all 17 Node tests pass, including bounded foot reach at four frame rates with turns and distance changes. Browser geometry checks pass for 32,996 sampled frames, checking foot reach and leg length in addition to walking surfaces, arrival, poses, body clearance, bench clearance and camera framing. The doorway walk was also inspected in the actual desktop interface.
