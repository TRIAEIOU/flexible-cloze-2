var config = {
    prompt: '',                 // Prompt when no hint
    hint: '%h',               // %h is replaced with hint text
    expose: {
        char: '!',              // Char to mark exposed cloze
        pos: 'begin',           // Char pos: `pre`, `begin`, `end` or `post`
        reverse: false          // If true exposed clozes are hidden, others shown
    },
    scroll: {                   // Valid values: `none`, `min`, `center`, `context`, `context-top` or `context-bottom`
        initial: 'min',         // Scoll on initial show
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
        additional: true       // Additional fields (Note, Mnemonics etc.)
    },
    fields: {
        title: true,                // Title area
        legend: [                   // Configurable legend at bottom
            '<span style="font-size: 150%;">&#8594;</span> Becomes',
            '<span style="font-size: 150%;">&#8658;</span> Leads to',
            '<span style="font-size: 150%;">&#10521;</span> Excite/activate',
            '<span style="font-size: 150%;">&#10979;</span> Inhibit/deactivate'
        ],
        flags: [                    // Configurable flag legend at bottom
            {
                text: "Incorrect",
                color: "#FD7C6E",
            },
            {
                text: "Duplicate",
                color: "#FAA76C",
            },
            {
                text: "Formating",
                color: "#81A984",
            },
            {
                text: "Rephrase",
                color: "#ADB9CA",
            },
            {
                text: "Discard",
                color: "#D89B9B",
            },
            {
                text: "Consolidate",
                color: "#33B3A6",
            },
            {
                text: "Mark",
                color: "#A64CA6",
            }
        ],
        show_all_button: false,      // Optional "show all" button at bottom of page
        log: true                    // Debug information level (`false`, `'error'` or `true`)
    }
}
