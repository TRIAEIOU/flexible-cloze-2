# Flexible cloze 2

Reimplementation of [Flexible cloze](https://ankiweb.net/shared/info/1632356464) Anki addon to handle nested clozes avalable from Anki 2.15.56 as well as remove lesser used features for easier maintenance. FC2 ([GitHub](https://github.com/TRIAEIOU/flexible-cloze-2)) is a configurable cloze note type for keeping related information (and cards) on the same note.

**Ideas for the functionality of Flexible cloze (1 and 2) was blatantly stolen from trgkanki's Cloze (Hide all) [https://ankiweb.net/shared/info/1709973686] and RisingOrange's Enhanced Cloze (for Anki 2.1) [https://ankiweb.net/shared/info/1990296174] - both of which are excellent addons.**

**ALL CREDIT FOR INNOVATION GOES TO TRGANKI AND RISINGORANGE**

<img src="https://github.com/TRIAEIOU/flexible-cloze-2/blob/main/Screenshots/front-and-back.png" height="500">

## General

Configuration is made in the note template, configuration is made between `<!-- CONFIGURATION BEGIN`/`END -->` on the `Front`/`Back Template` respectively. Styling is made between `/*-- STYLE BEGIN`/`END --*/` of the `Styling` page. JS/CSS between `<!-- FUNCTIONALITY BEGIN`/`END -->` tags is the actual FC2 code, not for configuration (will be overwritten on next update). The update logic is dependent on the user keeping the `<!-- FC2/CONFIGURATION/FUNCTIONALITY BEGIN/END -->` (and equivalent in the `Styling` page) intact.

- Clicking an active cloze on the front side will cycle it between hint (if there is one) and show.
- Clicking an inactive cloze on the front side will cycle it between hide and show (no hint).
- For notes that are "sequential" in nature (e.g. cloze 2 builds on the answer of cloze 1) try using the the v3 scheduler and `Deck options` as follows:
  - `New card gather order`: `Deck`
  - `New card sort order`: `Order gathered`
  - `Bury new siblings`, `Bury review siblings` and `Bury interday learning siblings`: `off`
- There is an optional "show all" button (styleable in class .fcz-show-all-btn). Note that he button is set to `display: none` in default configuration, you have to set it to `display: inline` on the Styling page of the cards dialog to get it to show:

``` CSS
/* SHOW ALL BUTTON ============================================== */
/* Show all button/bar styling (and if visible or not) */
#fcz-show-all-btn
{ display: inline;  background-color: #465A65; color: white; text-align: center; text-transform: uppercase;
font-size: 15px; font-weight: bold; padding: 5px; border-bottom: 1px solid white; }
```

## Configuration

- Active cloze: Cloze(s) with the current ordinal, i.e. the cloze(s) that should be answered. To change styling of these change or override `.cloze` class in `Styling` of the card template.
- Inactive cloze: Cloze(s) that are not the current ordinal, i.e. the cloze(s) that should not be answered.To change styling of these change or override `.cloze-inactive` class in `Styling` of the card template.
- Exposed cloze: Cloze(s) that when inactive (see above) will always be in "shown" state. Mark a cloze as exposed in the editor by making the first character an exclamation mark (e.g. `{{c1::!This will always be displayed when the cloze ordinal is not 1}}`).
  - Configurable expose character(s), default is `!`
  - Configurable position of the expose position to allow use with {{type:cloze:Text}}:
    - pre: **!**{{c1::content}}
    - begin (default): {{c1::**!**content}}
    - end: {{c1::content **!**}}
    - post: {{c1::content}}**!**
  - Configurable to reverse the expose status, i.e. all inactive clozes are exposed and those marked as `expose` will be hidden.
- Cloze prompts can be congigured:
  - `prompt`: Prompt format/text for clozes without hint. Example: `[...]`
  - `hint`: Prompt format/text for clozes with hint where `%h` will be replaced by the hint text. Example: `[%h]`
- `scroll`: Configurable scrolling behaviour on card show/flip, when clicking a hidden cloze and when cycling to next/previous with edge taps or keyboard shortcuts:
  - `none`: no scroll
  - `min`: scrolls as little as possible to get active cloze(s) into view
  - `center`: centers the active clozes in the window.
  - `context`: scrolls to just below the preceeding inactive cloze (or centers if all context fits).
  . `section-context`: as `context` but will scroll to just below preceeding inactive cloze or `<hr>` tag or just above preceeding `<h1>`-`<h6>` tag (or centers if all context fits).
  - Scroll on initial display (of front or back): `inital`.
  - Scroll on click: `click`.
  - Scroll on iterate (pressing next key etc.): `iterate`.
- `iteration` - cycling active clozes with keyboard shortcut or edge tap. Iteration behaviour can be configured as follows:
  - Hide the cloze "you are leaving" when iterating: `hide`
  - Loop iteration once you reach the first/last (otherwise you will stop): `loop`
  - Always start iteration from the top (otherwise iteration will "continue" from the last clicked item): `top`
- `show` cloze initial display behaviour:
  - `inactive`: inactive clozes (setting to `true`will make FC2 behave similar to core Anki clozes).
  - `addtional`: Additional fields (including Information field).
  - `information`: Information field (regardless of `additional`).
- Styling of different elements (e.g. "I want the answer to be displayed inline rather than in a block") can easily be configured in the `Styling` section of the card template.
- Changes will mainly be made inside `FC2 BEGIN`/`END` tags, which in turn is divided into functionality and configuration allowing the user to avoid overwriting their modification part on update.

## Regarding styling

The default styling of the template does not look like "regular Anki clozes". You can have the clozes display however you want by adjusting the CSS on the "Styling" page of the "Cards" dialog.

### To achieve the "regular Anki cloze styling"

On both `Front Template` and `Back Template` under `CONFIGURATION BEGIN` set:

``` javascript
var config = {
    prompt: '[...]'             // Prompt when no hint
    hint: '[%h]',               // %h is replaced with hint text
    expose: {
        chars: '!',             // Char(s) to mark exposed cloze
        pos: 'begin',           // Char pos: `pre`, `begin`, `end` or `post`
        reverse: false          // If true exposed clozes are hidden, others shown
    },
    scroll: {                   // Valid values: `none`, `min`, `center` or `context`
        initial: 'none',        // Scoll on initial show
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
        info: false             // Information field
    }
}
```

In the `CLOZE STYLING` section of the `Styling` page replace all the content with:

``` CSS
span.cloze {color: blue; font-weight: bold;}
```

## Main difference from the earlier mentioned add-ons

There is effectively no add-on, it's all JavaScript (and HTML/CSS) and runs 100% "client side" (the only python is the update logic). The logic requires an Anki version based on the 2.15.56 back end (i.e. Anki desktop 2.15.56, AnkiDroid 2.XYZ or AnkiMobile 2.XYZ).

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
