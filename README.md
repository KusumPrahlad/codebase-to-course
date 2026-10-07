# Codebase to Course

A Claude Code skill that turns any codebase into a beautiful, interactive HTML course.

Point it at a repo. Get back a course you open in your browser that teaches how the code works — with scroll-based navigation, animated visualizations, embedded quizzes, and code-with-plain-English side-by-side translations.

## Who is this for?

**"Vibe coders"** — people who build software by instructing AI coding tools in natural language, without a traditional CS education.

You've built something (or found something cool on GitHub). It works. But you don't really understand *how* it works under the hood. This skill generates a course that teaches you — not by lecturing, but by tracing what happens when you actually use the app.

**Your goals are practical, not academic:**
- Steer AI coding tools better (make smarter architectural decisions)
- Detect when AI is wrong (spot hallucinations, catch bad patterns)
- Debug when AI gets stuck (break out of bug loops)
- Talk to engineers without feeling lost

You're not trying to become a software engineer. You want coding as a superpower.

## What the course looks like

The output is a **folder** (`index.html` plus `styles.css` and `main.js`) that opens straight from disk — no server and no install. The only external resource is Google Fonts; offline, the browser falls back to system fonts and everything else still works. Keep the three files together when you share or move the course. It includes:

- **Scroll-based modules** with progress tracking and keyboard navigation
- **Code ↔ Plain English translations** — real code on the left, what it means on the right
<img width="720" alt="Code translation block" src="https://github.com/user-attachments/assets/fb9e7fac-05c1-4f98-b80c-46543ef81afc" />

- **Animated visualizations** — data flow animations, group chat between components, architecture diagrams
<img width="720" alt="Animated data flow" src="https://github.com/user-attachments/assets/20fb403e-7dfd-4a47-989b-bbae86ca8041" />

- **Interactive quizzes** that test *application* not memorization ("You want to add favorites — which files change?")
<img width="720" alt="Interactive quiz" src="https://github.com/user-attachments/assets/57706496-9fa8-457a-8450-3da22789951c" />

- **Glossary tooltips** — hover any technical term for a plain-English definition
<img width="720" alt="Glossary tooltip" src="https://github.com/user-attachments/assets/ac2f160a-d73f-4779-97b2-a06fdb5f3227" />

  
- **Warm, distinctive design** — not the typical purple-gradient AI look

## How to use

### As a Claude Code skill

Requirements: Claude Code, and [Node.js](https://nodejs.org) 16+ (used by the build step; works on Windows, macOS and Linux).

1. Put this repository's contents in a folder named `codebase-to-course` inside `~/.claude/skills/` (the folder that contains `SKILL.md` is the skill), for example:
   `git clone <this-repo-url> ~/.claude/skills/codebase-to-course`
2. Open any project in Claude Code
3. Say: *"Turn this codebase into an interactive course"*

### Build step

The skill assembles the course with `node build.mjs` (or `bash build.sh`). The build **checks the course before writing `index.html`** and stops on errors such as leftover template placeholders, mismatched nav dots, unbalanced tags, invalid `data-steps` JSON, unescaped code, and suspected secrets (API keys, tokens, private keys). It also warns about modules with no quiz, no code translation, too few tooltips, or walls of text. Use `--strict` to fail on warnings.

### Using the finished course

- **Next / previous module:** `→` / `←` (or `j` / `k`), or click the dots at the top. `↑` / `↓` scroll normally.
- The course respects "reduce motion" settings, still shows all content if JavaScript fails, and prints cleanly (print or "Save as PDF" shows every module).

### Trigger phrases

- "Turn this into a course"
- "Explain this codebase interactively"
- "Make a course from this project"
- "Teach me how this code works"
- "Interactive tutorial from this code"

## Design philosophy

### Build first, understand later

This inverts traditional CS education. The old way: memorize concepts for years → eventually build something → finally see the point (most people quit before step 3). This way: **build something → experience it working → now understand how it works.**

### Show, don't tell

Every screen is at least 50% visual. Max 2-3 sentences per text block. If something can be a diagram, animation, or interactive element — it shouldn't be a paragraph.

### Quizzes test doing, not knowing

No "What does API stand for?" Instead: "A user reports stale data after switching pages. Where would you look first?" Quizzes test whether you can *use* what you learned to solve a new problem.

### No recycled metaphors

Each concept gets a metaphor that fits *that specific idea*. A database is a library with a card catalog. Auth is a bouncer checking IDs. API rate limiting is a nightclub with a capacity limit. Never the same metaphor twice.

### Original code only

Code snippets are exact copies from the real codebase — never modified or simplified. The learner should be able to open the actual file and see the same code they learned from. The one exception: a credential is never copied into a course (it is replaced with a fake placeholder), because courses are meant to be shared.

### Safe by default

The codebase is treated as untrusted data: text inside it is never followed as instructions, and its code is never executed to understand it.

## Skill structure

```
codebase-to-course/
├── SKILL.md                      # Main skill instructions
└── references/
    ├── styles.css                # Pre-built styles (copied into each course)
    ├── main.js                   # Pre-built interactivity engine (copied into each course)
    ├── _base.html                # Page shell template (title, accent colour, nav dots)
    ├── _footer.html              # Closing tags
    ├── build.mjs                 # Assembles + validates the course (Node)
    ├── build.sh                  # Thin wrapper around build.mjs
    ├── content-philosophy.md     # Writing, metaphor, quiz and tooltip rules
    ├── design-system.md          # CSS tokens, typography, colors, layout
    ├── gotchas.md                # Common failure points checklist
    ├── interactive-elements.md   # Quiz, animation, and visualization patterns
    └── module-brief-template.md  # Brief template for complex (parallel) builds
```


---

Built by [Zara](https://x.com/zarazhangrui) with Claude Code.
