# Design System Document: The Celestial Canvas

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Sanctuary"**

This design system is engineered to transform journaling from a chore into a ritual. By pivoting away from the "grid-and-border" fatigue of traditional SaaS, we embrace a high-end editorial philosophy. We treat the digital screen as a physical space—a sanctuary where thoughts can breathe.

The system breaks the "template" look through **Intentional Asymmetry** and **Tonal Depth**. Rather than centering everything, we use staggered layouts and generous, "wasteful" whitespace to signal luxury and focus. The experience is not just "minimal"; it is "reductive," stripping away everything that isn't the user's voice until only the typography and the canvas remain.

---

### 2. Colors & Surface Philosophy
The palette is a sophisticated interplay between absolute contrast and subtle environmental shifts. We use the Material convention to drive a tiered architecture of focus.

*   **Primary (`#0058bc`):** Reserved for the "Focus Point." Use this for high-priority actions or to highlight a moment of insight in the journal.
*   **Surface Hierarchy (The Nesting Rule):** We define space through weight, not lines.
    *   **Background (`#f9f9fb`):** The base environment.
    *   **Surface-Container-Lowest (`#ffffff`):** Use this for the actual writing canvas to create a "paper on desk" feel.
    *   **Surface-Container-High (`#e8e8ea`):** Use this for sidebars or utility panels to "recede" them into the background.

**The "No-Line" Rule:**
1px solid borders are strictly prohibited for sectioning. To separate the sidebar from the editor, use a background shift (e.g., `surface-container-low` against `surface`). Boundaries are felt, not seen.

**The "Glass & Gradient" Rule:**
For floating elements like "Save" buttons or "Entry Modals," use Glassmorphism. Utilize a semi-transparent `surface-container-lowest` with a `backdrop-blur` of 20px. This allows the user’s text to softly bleed through the UI, maintaining a sense of place.

---

### 3. Typography
Typography is the primary UI element. We utilize **Inter** to mimic the precision of San Francisco, emphasizing "Airy Leading" (line-height: 1.6+).

*   **Display-LG (3.5rem):** Used exclusively for the "State of Mind" or "Journal Title." It should feel massive, yet light (Regular or Light weight).
*   **Headline-MD (1.75rem):** For date headers or significant section breaks.
*   **Body-LG (1.0rem):** The "Writing" weight. High readability is paramount. Ensure a maximum line-length of 65 characters to prevent eye fatigue.
*   **Label-MD (0.75rem):** Uppercase with increased letter-spacing for metadata (e.g., "LAST EDITED 2:00 PM").

The hierarchy conveys the brand by treating the journal like a premium magazine layout rather than a database.

---

### 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** A card (using `surface-container-lowest`) sitting on a section (`surface-container-low`) creates a natural "lift." This mimics physical paper layers.
*   **Ambient Shadows:** If a floating element requires a shadow (e.g., a "New Entry" FAB), use an extra-diffused shadow: `box-shadow: 0 10px 40px rgba(0, 26, 65, 0.06);`. The shadow is a tinted version of `on-primary-fixed`, making it feel like light is passing through the blue accent.
*   **The "Ghost Border" Fallback:** If a container requires definition against a white background, use the `outline-variant` at 15% opacity. It should be barely perceptible—a "whisper" of a boundary.

---

### 5. Components

**Buttons**
*   **Primary:** `primary-container` background with `on-primary` text. No borders. `xl` (0.75rem) corner radius. Use a subtle gradient from `primary` to `primary-container` to add "soul."
*   **Tertiary:** No background, `primary` text. Upon hover, use a `surface-container-high` subtle ghost fill.

**The Journaling Canvas (Input Fields)**
*   **Text Areas:** No borders or background fills. The "input" is simply the white space of the `surface-container-lowest`. Focus is signaled by a blinking `primary` cursor, not a blue outline.
*   **Input Labels:** Use `label-sm` in `secondary` color, floating above the input with 12px of spacing.

**Cards & Lists**
*   **The Divider-Free List:** List items are separated by `24px` of vertical whitespace (using the spacing scale). Use a `surface-container-low` hover state with an `lg` (0.5rem) corner radius to indicate selection. Never use horizontal lines.

**Chips (Tags/Moods)**
*   Low-profile. `surface-container-high` background with `on-surface-variant` text. High `full` roundedness.

---

### 6. Do’s and Don'ts

**Do:**
*   **Do** use asymmetrical margins. A journal entry should have a wider margin on the left than the right to feel like a book spine.
*   **Do** use `display-lg` typography to fill empty states. If there are no entries, "Nothing but stars" in large, light type is better than a gray icon.
*   **Do** favor `surface-container-lowest` (pure white) for areas where the user creates content.

**Don't:**
*   **Don't** use 100% black (#000000) for body text. Use `on-surface` (#1a1c1d) to reduce eye strain.
*   **Don't** use standard "Select" or "Input" boxes. Re-imagine them as interactive typography.
*   **Don't** cram the UI. If a screen feels "efficient," you have likely failed the "Sanctuary" principle. Add 20% more whitespace than you think you need.