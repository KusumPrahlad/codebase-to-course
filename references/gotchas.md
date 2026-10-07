# Gotchas — Common Failure Points

> **When to read this:** During Phase 3 (writing module HTML) and Phase 4 (review). Check every one of these before considering a course complete.

These are real problems encountered when building courses. Check every one before considering a course complete.

### Tooltip Clipping
Translation blocks use `overflow: hidden` for code wrapping, which would clip a tooltip placed inside the term element. `main.js` already avoids this (tooltips are `position: fixed` and appended to `document.body`), so use the `.term` markup exactly as shown in `interactive-elements.md` and never write your own tooltip CSS or JS.

### Not Enough Tooltips
The most common failure is under-tooltipping. Non-technical learners don't know terms like REPL, JSON, flag, entry point, PATH, pip, namespace, function, class, module, PR, E2E, or even software names like Blender/GIMP. **Rule of thumb:** if a term wouldn't appear in everyday conversation with a non-technical friend, tooltip it. Err heavily on the side of too many. BUT: don't tooltip terms the user already knows well from their domain (e.g., AI/ML concepts for someone in AI).

### Walls of Text
The course looks like a textbook instead of an infographic. This happens when you write more than 2-3 sentences in a row without a visual break. Every screen must be at least 50% visual. Convert any list of 3+ items into cards, any sequence into step cards or flow diagrams, any code explanation into a code↔English translation block.

### Recycled Metaphors
Using "restaurant" or "kitchen" for everything. Every module needs its own metaphor that feels inevitable for that specific concept. If you catch yourself reaching for the same metaphor twice, stop and find one that fits the concept organically.

### Code Modifications
Trimming, simplifying, or "cleaning up" code snippets from the codebase. The learner should be able to open the real file and see the exact same code. Instead of editing code to be shorter, *choose* naturally short snippets (5-10 lines) from the codebase that illustrate the point.

### Quiz Questions That Test Memory
Asking "What does API stand for?" or "Which file handles X?" — those test recall, not understanding. Every quiz question should present a new scenario the learner hasn't seen and ask them to *apply* what they learned.

### Scroll-Snap Mandatory
Using `scroll-snap-type: y mandatory` traps users inside long modules. Always use `proximity`.

### Module Quality Degradation
Trying to write all modules in one pass causes later modules to be thin and rushed. Build one module at a time and verify each before moving on. For complex codebases, use the parallel path with module briefs.

### Missing Interactive Elements
A module with only text and code blocks, no interactivity. Every module needs at least one of: quiz, data flow animation, group chat, architecture diagram, drag-and-drop. These aren't decorations — they're how non-technical learners actually process information.

### Apostrophes in `data-steps`
`data-steps='[...]'` is single-quoted, so an apostrophe in a label (`the user's request`) ends the attribute early and the JSON is invalid. The flow animation then shows an error message and `node build.mjs` fails with "invalid data-steps JSON". Avoid apostrophes in labels or write them as `&apos;`.

### Unescaped Code
Raw `<` and `&` inside `<pre><code>` are parsed as HTML: `List<String>` loses `<String>`, and `a && b` can break. Always write `&lt;`, `&gt;` and `&amp;`. The build fails on unescaped tags in code blocks.

### Secrets in Snippets
Config files, `.env` examples and test fixtures often contain real keys. The course is meant to be shared, so never use a snippet containing a credential; pick another one. The build scans for common key formats and fails if it finds one.

### Skipping the Build Report
`node build.mjs` prints warnings (missing quiz or translation block, too few tooltips, walls of text, no chat or flow animation). A build that "succeeds" with warnings is not finished; fix them before presenting the course.

### Editing the Fixed Files
Never edit or re-type `styles.css`, `main.js` or `build.mjs` in the course folder. Copy them with `cp`. If a widget misbehaves, fix the module markup, not the engine.
