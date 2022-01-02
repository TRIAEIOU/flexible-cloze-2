# Flexible cloze
Flexible cloze is an Anki addon (https://ankiweb.net/shared/info/1632356464) for a configurable cloze note type for keeping related information (and cards) on the same note (Anki forum thread https://forums.ankiweb.net/t/flexible-cloze-support-thread/14504).

**Ideas for the functionality of this cloze variant blatantly stolen from trgkanki's Cloze (Hide all) [https://ankiweb.net/shared/info/1709973686] and RisingOrange's Enhanced Cloze (for Anki 2.1) [https://ankiweb.net/shared/info/1990296174] - both of which are excellent addons. However all code written from scratch (ok, I peeked at some other code).**

**ALL CREDIT FOR INNOVATION GOES TO TRGANKI AND RISINGORANGE**

<img src="https://aws1.discourse-cdn.com/standard11/uploads/anki2/original/2X/c/cd79af177ab8298f861868740a357429984f4a59.jpeg" height="300">
<img src="https://aws1.discourse-cdn.com/standard11/uploads/anki2/original/2X/f/f00bd7c90b8f0163a91aa96e9abd75a1666b53b6.jpeg" height="300">

## General
- Active cloze: Cloze(s) with the current ordinal, i.e. the cloze(s) that should be answered. To change styling of these change (or better yet override) "fcz-active" class in "Styling" of the card template.
- Inactive cloze: Cloze(s) that are not the current ordinal, i.e. the cloze(s) that should not be answered. To change styling of these change (or better yet override) "fcz-inactive" class in "Styling" of the card template.
- Exposed cloze: Cloze(s) that when inactive (see above) will always be in "shown" state on the front side. Mark a cloze as exposed in the editor by making the first character an exclamation mark (e.g. "{{c1::!This will be displayed on the front when the cloze ordinal is not 1}}"). To change styling of these change (or better yet override) "fcz-expose" class in "Styling" of the card template.
- Styling of different elements (e.g. "I want the answer to be displayed inline rather than in a block") can easily be configured in the "Styling" section of the card template (which is now fairly documented with descriptions).
- To facilitate end user modifications of the layout, style and function of the template updates will come with a dialog allowing the user to determine which parts to update. A temporary backup (will be overwritten on next update) of the current template will be created in the add-on folder.
- Changes will mainly be made inside "FCZ BEGIN/END" tags, which in turn is divided into functionality and styling allowing the user to avoid overwriting the styling part on update.
- Configuration is made in the "Styling" section of the card template under the ".fcz-config" heading:
<pre><code>/* FLEXIBLE CLOZE CONFIGURATION======================================= */
.fcz-config {
    --cloze-element: "div";                 /* What HTML element the clozes will be wrapped in                  */
    --inactive-prompt: "";                  /* Text to display (if any) on inactive hidden clozes               */
    --active-prompt: "";                    /* Text to display (if any) on active hidden clozes                 */
    --key-next-cloze: "j";                  /* Keyboard shortcut to iterate forward                             */
    --key-previous-cloze: "h";              /* Keyboard shortcut to iterate backward                            */
    --key-toggle-all: "k";                  /* Keyboard shortcut to toggle all fields hide/show                 */
    --iterate-from-top: "false";            /* true makes next/previous iteration always start from top         */
    --iterate-inactive: "false";            /* true makes next/previous navigation also iterate inactive clozes */
    --iteration-hides-previous: "true";     /* false leaves cloze open when cycling forward/backward            */
    --show-all-on-back: "false";            /* false initially hides inactive clozes on back                    */
    --show-additional-on-back:  "true";     /* false initially hides the additional fields on back              */
}</code></pre>
- Clicking an active cloze on the front side will cycle it between hint (if there is one) and show.
- Clicking an inactive cloze on the front side will cycle it through hide - hint - show.
- A suggestion is using show new siblings in order / no same day spacing(randomization) for new siblings (https://ankiweb.net/shared/info/268644742) when writing notes that are "sequential" in nature. I.e. when the later clozes in the note requires knowing the earlier clozes. This makes the clozes be presented in ascending order on new cards (which is when it needs to be ordered). Once learned they will not be ordered (or even on the same day depending on how well/fast you learn the different clozes) but then you already "know the preceding clozes".
- There is an optional "show all" button (styleable in class .fcz-show-all-btn), note that:
  - The button is set to display: none in default configuration, you have to set it to display: inline on the Styling page of the cards dialog to get it to show.
<pre><code>/* ANSWER SIDE STYLING ============================================== */
/* Show all button/bar styling (and if visible or not) */
.fcz-show-all-btn
{ display: inline;  background-color: #465A65; color: white; text-align: center; text-transform: uppercase;
font-size: 15px; font-weight: bold; padding: 5px; border-bottom: 1px solid white; }</code></pre>
  If you are updating from a previous version of the template and choose to not "overwrite all" (overwriting any personal changes you have made) you will have to manually add the actual button on the front as this requires changing the HTML outside the FCZ BEGIN/END tags. Insert `<div id="fcz-show-all" class="fcz-show-all-btn" style="cursor: pointer;" onclick="fcz_toggle_all()">Show all</div>` just after the closing div-tag of the `<div id="fcz-additional" style="z-index: 2;">` (have a look in the add-on directory in fcz-front.html).

## Regarding styling
As there have been a few questions regarding the default styling of the template not looking like "regular Anki clozes". You can have the clozes display however you want by adjusting the CSS on the "Styling" page of the "Cards" dialog. To achieve the "regular Anki cloze styling":
In the "FLEXIBLE CLOZE CONFIGURATION" section set:
<pre><code>--cloze-element: "span";
--inactive-prompt: "[...]";
--active-prompt: "[...]";</code></pre>
Replace all the content under the "CLOZE STYLING" section with `.fcz-active { color: blue; font-weight: bold; }`. If by chance I am little off on the font-weight you can fine-tune it by starting at 400 which is normal font-weight and going upward (900 would be "very bold"). Similarly if by chance the blue nuance is off you can insert the correct RGB instead, e.g. #0000FF.

<img src="https://aws1.discourse-cdn.com/standard11/uploads/anki2/original/2X/1/19e94cbb8a36c790df2b0595d617820ab8ece13e.jpeg" height="300">
<img src="https://aws1.discourse-cdn.com/standard11/uploads/anki2/original/2X/2/20433455dd0c9ee1c2c6644e7c8e69fb2c3beec3.jpeg" height="300">

## Main difference from the earlier mentioned add-ons
There is effectively no add-on, it's all JavaScript (and HTML/CSS) and runs 100% "client side" (the only python is the update logic). This has a number of effects:
- The only thing the add-on does is insert a new note type (Flexible Cloze) with the relevant JS/HTML/CSS, once you have it (and don't want any updates) feel free to uninstall the add-on. Similarly you can share decks with anyone without any need for them to install anything since everything is in the note type.
- There are no special fields etc., the note type uses vanilla Anki clozes and parses them runtime.
- There are no complaints from Anki on missing clozes and no insertions into the notes of any type of markup or extra fields (so for anyone wanting to go to Anki's limit of 500 clozes, go ahead).
- Included is my note styling and configuration (the way it functions and which fields are present are more or less a complete rip-off from RisingOrange). However, you can edit the note type however you want if you know a little HTML and CSS.
- This allows for keeping related content on the same note facilitating note creation (no need to search through the deck to see if you already added a card with similar content). It can also help when reviewing as you can look at the other related clozes if you need to check something (e.g. "Well if it wasn't that, what was it?"). This is how I design my notes, hence the layout.
- I would recommend keeping any note type edits outside the FCZ BEGIN/END marks as content inside will be overwritten if the addon is updated (assuming you still have it installed). However if you want to keep the add-on for updates but want to muck about inside the begin/end tags I would suggest you duplicate the note type and rename your version to whatever (updates are made only on the appropriately named note type).
- If you, like me tend to do your reviews on a tablet the effect of having everything on the note makes it possible to edit the note on, for instance AnkiDroid, without any issues.
- Since all is on the note configurations (like how the clozes look etc.) are in the CSS there is no configuration from the add-on pane.
- Hardly an important difference but I use the flags for marking cards that needs to be corrected in different ways so there is a flag legend at the bottom (colors and text configurable) that takes up minimal space. Similarly there is a figure legend at the bottom (edit the front template to insert/change symbols).

## Similarities with the above two add-ons
- Almost identical fields, albeit styled differently, as Enhanced Cloze. But as earlier mentioned, you can rip out whatever you don't want or copy/paste the card contents to a new note type and design your own as long as:
- You have a div (or span) tag with id "fcz-content" somewhere as that is where the content is inserted runtime.
- You set the class "fcz-scroll-area" on the element where you want scrolling to occur.
- You have the {{FrontSide}} on the back side (to make the JS available).
- As with Enhanced Cloze you can navigate with keyboard shortcuts (h-j-k per default, configurable) or the edges of the screen.
- As with Enhanced Cloze you can expand individual clozes (active and inactive) on the front side as well as iterate through the active ones (e.g. all {{c:2}} clozes one by one) by pressing the side edges of the screen or keyboard shortcuts. This can be practical to learn lists or tables. You can have the cloze you iterate away from remain expanded or collapse (configurable) and also select whether all clozes or only active clozes should be iterated.
- As with Enhanced Cloze you can expand (and collapse) all clozes (active and inactive) by pressing the top of the screen. Additional fields (below the main Text field) can be expanded and collapsed by clicking them. It functions a little differently from Enhanced Cloze but the general idea is the same.

## Changelog
- 2022-01-01: Scroll logic bug fix.
- 2021-12-26: Adjustment of scroll logic to facilitate user custom card layout. If not using (or not updating to the latest version of) the "default" Flexible Cloze template the <div> that should be scrolled needs to have the "fcz-scroll-area" class (the scroll logic is applied to the first element with the fcz-scroll-area class).
- 2021-12-15: Custom scroll logic implemented, it should now automatically scroll to fit as many active clozes as possible when required (scrolling as little as possible but with a single line margin). Minor code refactoring.
- 2021-11-13: Added selective update dialog inc. temporary backup of previous template. Added exposed cloze functionality (see above). Added option to iterate inactive clozes (see above). Added option to always start next/previous iteration from top (see above). Split FCZ BEGIN/END content into FUNCTIONALITY and STYLING for selective updates. Added symbol legend at bottom. Refactoring of code.
- 2021-11-15: Added functionality/options to initially show or hide inactive clozes (--show-all-on-back) and additional fields (--show-additional-on-back). Added a "show all button" (stylable under .fcz-show-all-btn-class).
