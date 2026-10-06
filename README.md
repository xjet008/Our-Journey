# Our Little Journey

A playful, romantic website with interactive 3D penguins and cinematic video backgrounds.

- Explore three places, share gentle conversations, and customize your penguin.
- Read a personal letter, listen to music, and capture a penguin selfie.
- Download or share a memory card with the moments and answers you choose.
- Responsive layouts, keyboard controls, and reduced-motion support.

## Run locally

Install Node.js, then run from the repository root:

```sh
node serve.cjs
```

Open http://127.0.0.1:4173 in your browser. No package installation or build step is required.

## Host the website

Publish the contents of `site/` with any static web host. The included scripts, Three.js library, posters, and optimized videos use relative paths.

## Personalize

Edit `draftLetter` and `draftMessage` near the top of `site/app.js` to change the default letter and closing message. Visitors can also edit the words in the site's settings; those edits are saved only in their browser.

## Privacy

Journey answers and progress stay in the current browser tab's `sessionStorage`. Motion preferences and edited letter/message text use `localStorage`. There is no backend or analytics service. A downloaded or shared memory card includes the answers the visitor chose to give; sharing happens only when the visitor chooses it.

## Credits

The three background videos were supplied by the project owner and optimized for this experience. Three.js is included under its MIT license; see `site/LICENSES.txt`.
