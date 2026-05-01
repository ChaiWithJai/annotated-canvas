# Annotated Canvas

## Product Overview

**The Pitch:** A minimalist Chrome sidebar and social platform for clipping, annotating, and discussing exact moments across the web. Clip-by-reference ensures original creators retain their traffic, while curators build a vibrant layer of commentary.

**For:** Researchers, media critics, and knowledge curators who need to share precise text, video timestamps, or audio segments with deep context.

**Device:** desktop

**Design Direction:** 'The Canvas' - Paper-white, aggressively minimalist layouts prioritizing content clarity. Relies on refined typography, generous whitespace, crisp 1px borders, and subtle indigo accents to guide interactions.

**Inspired by:** Are.na, Readwise Reader

---

## Screens

- **Sidebar Extension:** Capture context (text/timecode) and draft annotations directly over the source page
- **Global Feed:** Chronological stream of public annotations and media clips from followed users
- **Annotation Permalink:** Dedicated public landing page for a single clip with source reference and moderation tools
- **User Profile:** A curated gallery of a single user's annotations and followers

---

## Key Flows

**Clip & Annotate:** Save a specific YouTube moment with commentary

1. User highlights video progress bar on YouTube -> opens Annotated sidebar
2. User authenticates via X/Google OAuth (first time only)
3. User adjusts In/Out timecodes (`01:23 - 02:45`) and types commentary in the text area
4. User clicks **Publish to Canvas** -> Clip is saved by reference and pushed to the global feed

---

<details>
<summary>Design System</summary>

## Color Palette

- **Primary:** `#4338CA` - Publish buttons, active states, key links
- **Background:** `#FCFCFC` - Global page background (Paper-white)
- **Surface:** `#FFFFFF` - Annotation cards, sidebar panel
- **Text:** `#171717` - Body text, primary headings
- **Muted:** `#E5E5E5` - Crisp 1px borders, subtle dividers
- **Accent:** `#FEE2E2` - Destructive actions, "File a claim" hover

## Typography

Distinctive, highly legible sans-serif for a refined editorial feel.

- **Headings:** `Instrument Sans`, 600, 24-32px
- **Body:** `Instrument Sans`, 400, 16px, 1.6 line-height
- **Small text:** `Instrument Sans`, 400, 13px
- **Buttons:** `Instrument Sans`, 500, 14px, 0.5px letter-spacing

**Style notes:** Ultra-minimalist. `2px` border radius on all elements. No drop shadows—depth is created strictly through 1px `#E5E5E5` borders and whitespace.

## Design Tokens

```css
:root {
  --color-primary: #4338CA;
  --color-background: #FCFCFC;
  --color-surface: #FFFFFF;
  --color-text: #171717;
  --color-muted: #E5E5E5;
  --color-accent: #FEE2E2;
  --font-primary: 'Instrument Sans', sans-serif;
  --radius: 2px;
  --spacing: 8px;
}
```

</details>

---

<details>
<summary>Screen Specifications</summary>

### Sidebar Extension

**Purpose:** The core capture tool, injected into the right side of the active browser tab.

**Layout:** 360px fixed-width vertical panel fixed to the right viewport edge. Left border separates it from the host page. Top: Context/Source. Middle: Auth or Draft area. Bottom: Actions.

**Key Elements:**
- **Source Header:** Favicon, Page Title, and URL domain (`13px`, `#737373`, truncated).
- **OAuth Block (Logged Out):** Two full-width buttons: **Continue with X** and **Continue with Google** (1px solid border, `#171717` text, hover fills `#F5F5F5`).
- **Capture Controls:** Auto-detects media. For video/audio: `In` and `Out` timecode inputs (`00:00:00` format, monospace font). For text: blockquote preview container.
- **Commentary Area:** Auto-expanding `textarea` with `Placeholder: Add your perspective...` (No visible borders, relies on spacing).
- **Publish Button:** Full-width bottom pinned button (`#4338CA` background, `#FFFFFF` text).

**States:**
- **Empty:** "Select text or focus a media player to begin clipping."
- **Loading:** Pulsing opacity on the Publish button during network request.

**Interactions:**
- **Hover Button:** Background darkens to `#3730A3`.
- **Focus Textarea:** Left 2px border turns `#4338CA` to indicate active typing.

### Global Feed

**Purpose:** Public discovery space for recent annotations from the community.

**Layout:** Single 640px centered column. Minimal header with logo and user avatar. Infinite scroll list of annotation cards.

**Key Elements:**
- **Navigation:** Top-left `Annotated`, Top-right `Profile` and `Following` tabs.
- **Feed Card:** Contains Author (`14px`, bold), Timestamp (`13px`, `#737373`), Source Link, the Clip Reference (text blockquote or embedded media player locked to timecodes), and the Author's Commentary.
- **Engagement Bar:** Minimal icons for Like, Repost, and Discuss below the commentary.
- **Source Pill:** A small inline badge `↗ youtube.com` linking directly to the source.

**States:**
- **Empty:** "No annotations yet. Start following users or clip your first."
- **Loading:** Skeleton rectangles tracing the borders of standard feed cards.

**Interactions:**
- **Click Source Pill:** Opens original source URL in a new tab.
- **Hover Card:** Entire card border changes from `#E5E5E5` to `#A3A3A3`.

### Annotation Permalink

**Purpose:** Dedicated landing page for sharing a single clip. Essential for moderation and public indexing.

**Layout:** 800px centered container. Large typography for commentary, structured metadata at the bottom.

**Key Elements:**
- **The Commentary:** Massive `32px` text dominating the top of the page.
- **The Clip:** Distinctly styled box (`#FCFCFC` background, 1px `#E5E5E5` border) containing the referenced media or text snippet.
- **Context Metadata:** Author info, exact date/time, and original source URL.
- **'File a claim' Button:** Bottom-right placement, subtle `12px` text link.

**States:**
- **Error:** "This annotation has been removed by the author or via moderation claim."

**Interactions:**
- **Click 'File a claim':** Opens a modal with DMCA/Copyright reporting options.
- **Hover 'File a claim':** Text turns `#EF4444` (red) to signify destructive/legal action.

### User Profile

**Purpose:** Showcase a curator's collection of clips.

**Layout:** Left sidebar (240px) for user meta, right main column (640px) for the chronological list of their annotations.

**Key Elements:**
- **Profile Sidebar:** Large Avatar (square, 1px border), Display Name, Bio, and **Follow** button (`#171717` background, `#FFFFFF` text).
- **Stats:** Followers and Following counts (`14px` text).
- **Annotation List:** Reuses the Feed Card component, stacked with 32px vertical gaps.

**Interactions:**
- **Click Follow:** Button background switches to `#FFFFFF`, text to `#171717`, label changes to **Following**.

</details>

---

<details>
<summary>Build Guide</summary>

**Stack:** HTML + Tailwind CSS v3

**Build Order:**
1. **Annotation Permalink** - Establishes the core typography, media reference component, and 'File a claim' UI.
2. **Global Feed** - Reuses the media reference component in a list context, establishes the grid/column layout.
3. **Sidebar Extension** - Implements the interactive capture inputs (timecodes) and OAuth buttons in a constrained width.
4. **User Profile** - Assembles the final layout combining user metadata and feed components.

</details>
