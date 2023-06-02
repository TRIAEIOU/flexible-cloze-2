export interface Configuration {
  prompt: string          // Prompt when no hint
  hint: string            // %h is replaced with hint text
  expose: {
    char: string                      // Char to mark exposed cloze
    pos: 'pre' | 'begin' | 'end' | 'post'   // Char pos
    reverse: boolean                  // If true exposed clozes are hidden, others shown
  }
  scroll: {
    initial: 'none' | 'min' | 'center' | 'context' | 'context-top' | 'context-bottom'
    click: 'none' | 'min' | 'center' | 'context' | 'context-top' | 'context-bottom'
    iterate: 'none' | 'min' | 'center' | 'context' | 'context-top' | 'context-bottom'
  }
  iteration: {
    top: boolean        // Always start iteration from top
    loop: boolean       // Restart from top/bottom from end
    hide: boolean       // Hide cloze iterated away from
  }
  shortcuts: {
    next: string        // Iterate to next cloze
    previous: string    // Iterate to previous cloze
    toggle_all: string  // Toggle all clozes and fields
  }
  show: {                         // `false` means initially collapsed/hidden
    inactive: boolean|'preceding' // Inactive clozes (`true`, `false` or `'preceding'`)
    additional: boolean           // Additional fields (Note, Mnemonics etc.)
  },
  fields: {
    title: boolean|undefined
    legends: string[][]|undefined
    show_all_button: boolean|undefined
    log: undefined|boolean|'error'    // Logging level (`false`, `'error'` or `true`)
  }|undefined
  front?: boolean                   // Front or back side
}
