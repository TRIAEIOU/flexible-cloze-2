# Flexible cloze 2

Reimplementation of [Flexible cloze](https://ankiweb.net/shared/info/1632356464) Anki addon to handle nested clozes avalable from Anki 2.15.56 as well as remove lesser used features for easier maintenance. FC2 ([GitHub](https://github.com/TRIAEIOU/flexible-cloze-2)) is a configurable cloze note type for keeping related information (and cards) on the same note.

**Ideas for the functionality of Flexible cloze (1 and 2) was blatantly stolen from trgkanki's [Cloze (Hide all)](https://ankiweb.net/shared/info/1709973686) and RisingOrange's [Enhanced Cloze (for Anki 2.1)](https://ankiweb.net/shared/info/1990296174) - both of which are excellent addons.**

**ALL CREDIT FOR INNOVATION GOES TO TRGANKI AND RISINGORANGE**

![Flexible cloze 2](https://raw.githubusercontent.com/TRIAEIOU/flexible-cloze-2/main/Screenshots/front-and-back.png){height=500px}

The addon adds two note types:

- `Flexible cloze 2`: Has 5 fields: `Title`, `Text`, `Notes`, `Mnemonics` and `Extra` where `Text` is the cloze field and `Title` the default sort field/shown in the card/note table.
- `Flexible cloze 2 (min)`; Has 2 fields: `Text` and `Back Extra`, similar to the core Anki `cloze` note type. When reviewing the first `<h1>` found in the `Text` field will be extracted and set as title (primarily for use with Markdown notes, there is no default way of inserting `<h1>` tags in the Anki editor), failing this it will insert the deck name.

The functionality, apart from what is mentioned above, is the same for both.

## iOS

Please note, I have no iOS device to test on, it *should* work as it is generic javascript. If something appears broken, please let me know (with debug info, see below).

## Use case

One note generation strategy is keeping one cloze note per "subject", rather than lots of small notes. This allows using Anki as the primary "note keeping location" rather than having the actual notes somewhere else (in OneNote, markdown files etc.) and have to create Anki notes for quizzing as a separate step. It also greatly improves maintainability (at lecture: "hmm, I seem to remember it was X, not Y, now where is that Anki note so I can amend it?"). During reviewing it adds the posibility to easily look up related info ("so if it wasn't ABX X for Y, for what was ABX X used?"). This while following the general **card** principles of making individual cards "atomic" and brief.

```text
# ACLS

## Terminology

Bla: {{c1::bla}}
Bla: {{c2::bla}}

## Drugs

Epi: {{c3::bla}}
Amiodarone: {{c4::bla}}

## Process

Unwitnessed arrest: {{c5::
1. Bla
2. Bla
}}
```

You can of course also use FC2 if you just want some more configurability/functionality for "regular clozes".

## Use

- Clicking an active cloze on the front side will cycle it between hint (if there is one) and show.
- Clicking an inactive cloze on the front side will cycle it between hide and show (no hint).
- Toggle all/cycle between active and/or inactive clozes (configurable) by tapping left/right/top of screen or keyboard shortcuts.
- Search in card from the reviewer (`Ctrl+F` or top bar) - if you, like me, have all your notes in Anki and want to be able to look something up quickly from your phone.
- There is an optional "show all" button (styleable with id #fcz-show-all-btn).

### Lists

Using same ordinal clozes with `iteration.loop = true` and `iteration.hide = true` you can easily review lists by using `next`/`previous` keyboard shortcuts or edge taps to cycle through the clozes. Example:

```text
Step 1: {{c1:someting}}
Step 2: {{c1:someting else}}
Step 3: {{c1:someting completely different}}

```

## Configuration

Configuration is made in the note template between:

- At the top of `Front`/`Back` between the `<!-- CONFIGURATION BEGIN`/`END -->` tags.
- At the bottom of `Styling` after the `/*-- FUNCTIONALITY END --*/` tag.

The update logic is dependent on the user keeping these tag intact and updates will overwrite everything that is marked as "functionality".

- Active cloze: Cloze(s) with the current ordinal, i.e. the cloze(s) that should be answered. To change styling of these change or override `.cloze` class in `Styling` of the card template.
- Inactive cloze: Cloze(s) that are not the current ordinal, i.e. the cloze(s) that should not be answered. To change styling of these change or override `.cloze-inactive` class in `Styling` of the card template.
- Exposed cloze: Cloze(s) that when inactive (see above) will always be in "shown" state. Mark a cloze as exposed in the editor by making the first character an exclamation mark (e.g. `{{c1::!This will always be displayed when the cloze ordinal is not 1}}`).
  - Configurable expose character, default is `!`
  - Configurable position of the expose position to allow use with {{type:cloze:Text}}:
    - pre: **!**{{c1::content}}
    - begin (default): {{c1::**!**content}}
    - end: {{c1::content **!**}}
    - post: {{c1::content}}**!**
  - Configurable to reverse the expose status, i.e. all inactive clozes are exposed and those marked as `expose` will be hidden.
- Cloze prompts can be configured:
  - `prompt`: Prompt format/text for clozes without hint. Example: `[...]`
  - `hint`: Prompt format/text for clozes with hint where `%h` will be replaced by the hint text. Example: `[%h]`
- `scroll`: Configurable scrolling behavior on card show/flip, when clicking a hidden cloze and when cycling to next/previous with edge taps or keyboard shortcuts:
  - `none`: no scroll.
  - `min`: scrolls as little as possible to get active cloze(s) into view.
  - `center`: centers the active clozes in the viewport (or places the first active cloze at the top if all active clozes won't fit the viewport).
  - `context`: as center but includes the context (content from preceding `<hr>`, `<h1>`-`<h6>` or inactive cloze).
  - `context-top`: as context but aligns the start of the context at the top of the viewport
  - `context-bottom`: as context but aligns the last of the active clozes at the bottom of the viewport (if the entire context fits, otherwise aligns top of context at top of viewport).
  - Scroll on initial display (of front or back): `initial`.
  - Scroll on click: `click`.
  - Scroll on iterate (pressing next key etc.): `iterate`.
- `iteration` - cycling active clozes with keyboard shortcut or edge tap. Iteration behavior can be configured as follows:
  - Hide the cloze "you are leaving" when iterating: `hide`
  - Loop iteration once you reach the first/last (otherwise you will stop): `loop`
  - Always start iteration from the top (otherwise iteration will "continue" from the last clicked item): `top`
- `show` cloze initial display behavior:
  - `inactive`: inactive clozes (setting to `true`will make FC2 behave similar to core Anki clozes).
  - `addtional`: Additional fields.
- `fields`: customizations of the interface
  - `title`: (only relevant for the min version) Wether to show the note "title field" (will parse out first `<h1>` or deck name if not found).
  - `legend`: Array of strings (inc HTML) that will be inserted into elements at the bottom of the page for use as symbol legend. Remove/empty to remove legend.
  - `flags`: Array of text and color codes that will be inserted at the bottom of the page for use as flag legend (each element will be colored according to the color code). Remove/empty to remove legend.
  - `show_all_button`: Show "Show all" button at bottom of card. (default `false`)
  - `log`: Level of logging, pops up a logging field at bottom of page when level is met (`false` for none, `error` errors and `true` for errors and debug information, default `error`). Please provide this information if/when reporting errors/bugs.
- Configuration can be overridden on an individual note by using Anki `Tags`, e.g add `fc2.cfg.front.scroll.initial.context-bottom` to set the front side initial scroll of the note to `context-bottom` (leave out the side to set for both front and back, e.g. `fc2.cfg.scroll.initial.context-bottom`)
- Styling of different elements (e.g. "I want the answer to be displayed inline rather than in a block") can easily be configured in the `Styling` section of the card template.

## Recommended companion addons

Some useful companion addons if you, like I, keep one note per subject rather than per question:

- Review in ascedning cloze ordinal order: [Asdcending cloze reviews](https://ankiweb.net/shared/info/545968093) or [AutoReorder](https://ankiweb.net/shared/info/757527607) or similar to **review** the cards from a note in ascending cloze ordinal order as later clozes may use the answers from earlier clozes.
  - For cloze order presentation of **new** cards use the the v3 scheduler and `Deck options` as follows:

    - `New card gather order`: `Deck`
    - `New card sort order`: `Order gathered`
    - `Bury new siblings`, `Bury review siblings` and `Bury interday learning siblings`: `off`

- Sort cloze ordinals in ascending order while keeping learning state: [Sort clozes](https://ankiweb.net/shared/info/157021113)
- If you prefer note taking in markdown: [Markdown input](https://ankiweb.net/shared/info/904999275)
- If you want to maximize the note taking space in the browser: [Sidebar table](https://ankiweb.net/shared/info/1753198255)
- If you want a little more `VS Code`-y interface, consider [CSS Injector - Change default editor styles](https://ankiweb.net/shared/info/181103283) with something like:

  ```css
  /* editor.css */
  div > div.editor-field {
    border-radius: unset;
    border: none !important;
    box-shadow: none !important;
    padding-left: 10px;
    padding-right: 10px;
    padding-bottom: 5px;
  }
  div:not(:nth-child(1)) > .field-container {
    border-top: 1px solid var(--border);
  }

  .editor-toolbar .button-toolbar {
    border: none;
    padding: 7px 7px 0px 7px;
    margin: 0px;
  }

  .editor-field {
    --fg: #3b3b3b;
    --selected-bg: #ADD6FF80;
  }
  .night_mode .editor-field {
    --fg: #d4d4d4;
    --selected-bg: #ADD6FF26;
  }

  body {
    --fg: #3b3b3b;
    --canvas: #ffffff;
    --canvas-elevated: #ffffff;
    --border: #CECECE;
    --border-focus: 1px solid #3794ff;
  }
  body.night_mode {
    --fg: #858585;
    --canvas: #1e1e1e;
    --canvas-elevated: #1e1e1e;
    --border: #474747;
    --border-focus: 1px solid #3794ff;
  }
  ```

## Regarding styling

The default styling of the template does not look like "regular Anki clozes". You can have the clozes display however you want by adjusting the CSS on the "Styling" page of the "Cards" dialog.

### To achieve the "regular Anki cloze styling"

On both `Front` and `Back` (with the exception of show.additional which should be `true` on `Back`) set configuration to:

```javascript
var config = {
    prompt: '[...]'             // Prompt when no hint
    hint: '[%h]',               // %h is replaced with hint text
    expose: {
        char: '!',              // Char to mark exposed cloze
        pos: 'begin',           // Char pos: `pre`, `begin`, `end` or `post`
        reverse: false          // If true exposed clozes are hidden, others shown
    },
    scroll: {                   // Valid values: `none`, `min`, `center` or `context`
        initial: 'none',        // Scroll on initial show
        click: 'min',           // Scroll on cloze click
        iterate: 'min'          // Scroll on iteration
    },
    iteration: {
        top: false,             // Always start iteration from top
        loop: true,             // Restart from top/bottom from end
        hide: false             // Hide cloze iterated away from
    },
    shortcuts: {
        next: 'j',              // Iterate to next cloze
        previous: 'h',          // Iterate to previous cloze
        toggle_all: 'k'         // Toggle all clozes and fields
    },
    show: {                     // `false` means initially collapsed/hidden
        inactive: true,         // Inactive clozes
        additional: false,      // Additional fields (Note, Mnemonics etc.)
    },
    fields: {
        title: false,           // Title area
        legend: [],             // Configurable legend at bottom
        flags: [],              // Configurable flag legend at bottom
        show_all_button: false, // Optional "show all" button at bottom of page
        log: 'error'            // Debug information level (`false`, `'error'` or `true`)
    }
}
```

In the `Styling` page insert the following below `/*-- FC2 FUNCTIONALITY END --*/`:

```CSS
span.cloze { all: unset; color: blue; font-weight: bold; }
span.cloze-inactive { all: unset; }
```

## Main difference from the earlier mentioned add-ons

There is effectively no add-on, it's all JavaScript (and HTML/CSS) and runs 100% "client side" (the only python is the update logic). The logic requires an Anki version based on the 2.15.56+ back end (i.e. Anki desktop 2.15.56+, AnkiDroid 2.16alpha93+ with `Use new backend` enabled or AnkiMobile 2.0.88+).

- Included is my note styling and configuration (the way it functions and which fields are present are more or less a complete rip-off from RisingOrange). However, you can edit the note type however you want if you know a little HTML and CSS.
- This allows for keeping related content on the same note facilitating note creation (no need to search through the deck to see if you already added a card with similar content). It can also help when reviewing as you can look at the other related clozes if you need to check something (e.g. "Well if it wasn't that, what was it?"). This is how I design my notes, hence the layout.
- I would recommend keeping any note type edits outside the FC2 `FUNCTIONALITY BEGIN`/`END` marks as content inside will be overwritten if the addon is updated (assuming you still have it installed). However if you want to keep the add-on for updates but want to muck about inside the begin/end tags I would suggest you duplicate the note type and rename your version to whatever (updates are made only on the appropriately named note type).
- Since all is on the note configurations (like how the clozes look etc.) are in the template there is no configuration from the add-on pane.
- Hardly an important difference but I use the flags for marking cards that needs to be corrected in different ways so there is a flag legend at the bottom (colors and text configurable) that takes up minimal space. Similarly there is a figure legend at the bottom (edit the front template to insert/change symbols).

## Similarities with the above two add-ons

- Almost identical fields, albeit styled differently, as Enhanced Cloze. But as earlier mentioned, you can rip out whatever you don't want or copy/paste the card contents to a new note type and design your own.
- As with Enhanced Cloze you can navigate with keyboard shortcuts (h-j-k per default, configurable) or the edges of the screen.
- As with Enhanced Cloze you can expand individual clozes (active and inactive) on the front side as well as iterate through the active ones (e.g. all {{c:2}} clozes one by one) by pressing the side edges of the screen or keyboard shortcuts. This can be practical to learn lists or tables. You can have the cloze you iterate away from remain expanded or collapse (configurable).
- As with Enhanced Cloze you can expand (and collapse) all clozes (active and inactive) by pressing the top of the screen. Additional fields (below the main Text field) can be expanded and collapsed by clicking them. It functions a little differently from Enhanced Cloze but the general idea is the same.

## Changelog

- 2023-01-23: Fix update logic bugs.
- 2023-02-07: Adapt JS to AnkiDroid behaviour, fix [expose bug](https://github.com/TRIAEIOU/flexible-cloze-2/issues/4).
- 2023-02-10: Fix hint bug.
- 2023-02-18: Fix scroll and hint bugs.
- 2023-03-26: Restructure code, add `context-top` and `context-bottom`, add note specific config through tags, add log option/info, add search function, add `Flexible Cloze 2 (min)` template which only has `Text` and `Back Extra` fields.
