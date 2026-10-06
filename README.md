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

Ordinary conversation reactions preserve personal space. Accepted hugs have a lead-in, hold and return; interrupted gestures separate smoothly. Selfie-to-memory transitions retain the selected pose and image. Back navigation is available at the memory card and returns to the top of the previous chapter.

Restart clears environmental discoveries, camera gestures, reaction and walking state, pending interactions, answers, photos and generated card URLs. Async photo/card results from an older journey are discarded. Sound, motion, world-detail preferences and personalized words are retained.

The audio bed continues between locations with gradual filter changes. Discovery chimes are short and limited; chords cannot stack. Sound fades down while the page is hidden. On leaving the page, audio and rendering resources are released.

Validation: eight Node tests and 16,380 sampled animation frames passed, including no sampled body penetration or bench-seat intersection. Full mobile journey checked at 390×844, with narrow portrait and landscape layout checks. The generated and downloaded memory PNG was verified at 1500×4421 pixels. Hardware Safari/iOS and Android GPU performance remain unverified.
