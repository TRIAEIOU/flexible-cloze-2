var config = {
    prompt: '',                 // Prompt when no hint
    hint: '[%h]',               // %h is replaced with hint text
    expose: {
        char: '!',              // Char to mark exposed cloze
        pos: 'begin',           // Char pos: `pre`, `begin`, `end` or `post`
        reverse: false          // If true exposed clozes are hidden, others shown
    },
    scroll: {                   // Valid values: `none`, `min`, `center` or `context`
        initial: 'center',     // Scoll on initial show
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
        inactive: false,        // Inactive clozes
        additional: true,       // Additional fields (Note, Mnemonics etc.)
        info: true              // Information field
    }
}
/*-- CONFIGURATION END --*/

/*-- FUNCTIONALITY BEGIN --*/
config.specific = null
var container
if (!container) container = document.querySelector('#fc2-title').parentElement
container.classList.remove('front')
container.classList.add('back')
