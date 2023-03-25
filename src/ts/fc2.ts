interface Configuration {
  prompt: string          // Prompt when no hint
  hint: string            // %h is replaced with hint text
  expose: {
    char: string                      // Char to mark exposed cloze
    pos: 'pre' | 'begin' | 'end' | 'post'   // Char pos
    reverse: boolean                  // If true exposed clozes are hidden, others shown
  }
  scroll: {
    initial: 'none' | 'min' | 'center' | 'context' // Scoll on initial show
    click: 'none' | 'min' | 'center' | 'context'   // Scroll on cloze click
    iterate: 'none' | 'min' | 'center' | 'context' // Scroll on iteration
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
  show: {                 // `false` means initially collapsed/hidden
    inactive: boolean   // Inactive clozes
    additional: boolean // Additional fields (Note, Mnemonics etc.)
    info: boolean       // Information field
  }
  debug: undefined | boolean | 'error' // Debug information level (`false`, `'error'` or `true`)
  front?: boolean                  // Front or back side
}

// Avoid double declarations
var FC2
FC2 ||= class {
  dbg: Function = () => {}
  expose!: (el: HTMLElement) => boolean
  cfg!: Configuration
  log!: HTMLElement | null
  content!: HTMLElement
  viewport!: HTMLElement
  current!: HTMLElement
  ordinal!: number

  /** One-time runs */
  constructor(config: Configuration) {
    // Setup debug
    if (config.debug) this.setup_debug(config.debug)

    // Check for backend version
    if (document.querySelector('.cloze')!['dataset'].ordinal === undefined)
      return

    // Setup document level event handlers
    document.addEventListener("click", (evt: MouseEvent) => {
      const target = evt.target as HTMLElement
      // Cloze click handling
      if (target.classList!.contains('cloze')
        || target.classList.contains('cloze-inactive')) {
        evt.stopPropagation() // To avoid toggling parents
        if (!this.cfg.iteration.top) this.current = evt.target as HTMLElement
        this.toggle_cloze(evt.target as HTMLElement)
        this.scroll_to({ scroll: this.cfg.scroll.click, cloze: evt.target as HTMLElement })

      } // Additional content (header and actual content)
      else if (target.classList.contains('additional-header'))
        this.toggle_field(target.nextElementSibling as HTMLElement)
      else if (target.classList.contains('additional-content'))
        this.toggle_field(evt.target as HTMLElement)
      // Toggle all button
      else if (target.id === 'fc2-show-all-btn') this.toggle_all()
      // Nav bars
      else if (target.id === 'nav-toggle-all') this.toggle_all()
      else if (target.id === 'nav-prev-cloze') this.iter(false)
      else if (target.id === 'nav-next-cloze') this.iter(true)
    })

    document.addEventListener("keydown", (evt: KeyboardEvent) => {
      if (evt.key === this.cfg.shortcuts.next) {
        this.iter(true)
        evt.preventDefault()
      } else if (evt.key === this.cfg.shortcuts.previous) {
        this.iter(false)
        evt.preventDefault()
      } else if (evt.key === this.cfg.shortcuts.toggle_all) {
        this.toggle_all()
        evt.preventDefault()
      }
    })
  }

  /** Done on each card/side */
  load(config: Configuration, side: 'front'|'back') {
    this.cfg = config
    this.cfg.front = side === 'front'
    this.content = document.getElementById('fc2-content')!
    this.viewport = document.getElementById('fc2-scroll-area')!
    this.current = this.content.querySelector('.cloze')!
    this.log = document.getElementById('fc2-log')
    this.ordinal ||= parseInt(this.current.dataset.ordinal!)
    this.expose = this.generate_expose()

    // Setup class lists
    this.content.parentElement!.classList.remove(this.cfg.front ? 'back' : 'front')
    this.content.parentElement!.classList.add(this.cfg.front ? 'front' : 'back')

    // Strip expose char from active clozes and hide if front
    this.content.querySelectorAll('.cloze').forEach(((cloze: HTMLElement) => {
      this.expose(cloze)
      if (this.cfg.front) this.hide(cloze)
    }) as any)

    // Expose inactive clozes from expose char or containing active cloze
    this.content.querySelectorAll('.cloze-inactive').forEach(((cloze: HTMLElement) => {
      if (this.expose(cloze) || cloze.querySelector('.cloze'))
        cloze.classList.remove('cloze-inactive')
      else if (!this.cfg.show.inactive) this.hide(cloze)
    }) as any)

    // Show additional fields per default depending on config
    if (!this.cfg.show.additional)
      this.viewport.querySelectorAll(':not(#info).additional-content')
        .forEach(nd => this.hide(nd as HTMLElement))

    // Show info field per default depending on config
    if (!this.cfg.show.info)
      this.hide(document.querySelector('#info.additional-content') as HTMLElement)

    // Track scrolling on front, on unload would be more efficient
    if (this.cfg.front) this.viewport.onscroll = (_evt) =>
        sessionStorage.setItem('fc2_vp_top', this.viewport.scrollTop.toString())

    // Reveal finished content, hide placeholder and scroll to first active cloze
    this.content.style.display = 'block'
    document.getElementById('fc2-content-placeholder')!.style.display = 'none'
    // Stacked requests as AnkiDroid takes a few frames to finish layout
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() =>
          this.scroll_to({scroll: this.cfg.scroll.initial})
        )
      )
    )
  }

  /** Initialize debug element and setup `this.dbg()` depending on config */
  setup_debug(debug: boolean|undefined|'error') {
    // Capture errors
    window.onerror = (emsg, _src, _ln, _col, err) => {
      this.log ||= add_log_el()
      this.log.innerText += `error ${emsg}:\n${err!.stack}\n`
      this.log.scrollTop = this.log.scrollHeight
      return true
    }

    // Else noop
    if (debug === true) this.dbg = function (str: string, args: any) {
      this.log ||= add_log_el()
      let msg = str
      if (args && (typeof (args) === typeof (arguments) || typeof (args) === typeof ([]))) {
        for (let i = 0; i < args.length; i++) {
          msg += i ? ', ' : ': '
          if (typeof (args[i]) == 'object') msg += JSON.stringify(args[i])
          else if (typeof (args[i]) == 'string') msg += `"${args[i]}"`
          else msg += args[i]
        }
      } else if (args) msg += `: ${args}`
      this.log.innerText += `${msg}\n`
      this.log.scrollTop = this.log.scrollHeight
    }

    /** Append log element */
    function add_log_el() {
      const log = document.createElement('pre')
      log.id = 'fc2-log'
      document.getElementById('fc2-scroll-area')!.parentElement!.appendChild(log)
      return log
    }
  }

  /** Create expose function from config */
  generate_expose(): (el: HTMLElement) => boolean {
    this.dbg('generate_expose', arguments)
    let expose_
    if (this.cfg.expose.pos === 'pre') {
      expose_ = (el) => {
        if (el.previousSibling?.data?.endsWith(this.cfg.expose.char))
          el.previousSibling.data = el.previousSibling.data.slice(0, -1)
        else return false
        return true
      }
    } else if (this.cfg.expose.pos === 'post') {
      expose_ = (el) => {
        if (el.nextSibling?.data?.startsWith(this.cfg.expose.char))
          el.nextSibling.data = el.nextSibling.data.substring(1)
        else return false
        return true
      }
    } else if (this.cfg.expose.pos === 'end') {
      expose_ = (el) => {
        if (el.dataset.cloze?.endsWith(this.cfg.expose.char))
          el.dataset.cloze = el.dataset.cloze.slice(0, -1)
        else if (el.lastChild?.data?.endsWith(this.cfg.expose.char))
          el.lastChild.data = el.lastChild.data.slice(0, -1)
        else return false
        return true
      }
    } else {
      expose_ = (el) => { // begin
        if (el.dataset.cloze?.startsWith(this.cfg.expose.char))
          el.dataset.cloze = el.dataset.cloze.substring(1)
        else if (el.firstChild?.data?.startsWith(this.cfg.expose.char))
          el.firstChild.data = el.firstChild.data.substring(1)
        else return false
        return true
      }
    }
    return this.cfg.expose.reverse ? (el) => { return !expose_(el) } : expose_
  }

  /** Hide cloze/field (and save cloze content PRN) */
  hide(el: HTMLElement) {
    this.dbg('hide', arguments)
    if (!el || el.classList.contains('hide')) return
    el.classList.add('hide')
    // Done if additional field
    if (el.classList.contains('additional-content')) return
    // Store cloze content and hint PRN
    if (el.dataset.cloze === undefined) el.dataset.cloze = el.innerHTML
    // Store hint PRN and possible
    if (el.dataset.hint === undefined) {
      if (el.innerHTML === '[...]' || el.classList.contains('cloze-inactive'))
        el.dataset.hint = this.cfg.prompt
      else
        el.dataset.hint = "" // This should try to parse hint from content and format?
    }
    el.innerHTML = el.dataset.hint
  }

  /** Show cloze/field (and save cloze hint PRN) */
  show(el: HTMLElement) {
    this.dbg('show', arguments)
    if (!el || !el.classList.contains('hide')) return
    el.classList.remove('hide')
    // Done if additional field
    if (el.classList.contains('additional-content')) return
    el.innerHTML = el.dataset.cloze!
    for (const child of el.querySelectorAll(':scope .cloze, :scope .cloze-inactive'))
      this.hide(child as HTMLElement)
  }

  /** Toggle cloze visibility state */
  toggle_cloze(cloze: HTMLElement) {
    this.dbg('toggle_cloze', arguments)
    cloze.classList.contains('hide') ? this.show(cloze) : this.hide(cloze)
  }

  /** Toggle field visibility state */
  toggle_field(field: HTMLElement) {
    this.dbg('toggle_field', arguments)
    field.classList.contains('hide')
      ? field.classList.remove('hide')
      : field.classList.add('hide')
  }

  /** Toggle all clozes and fields, sync towards show */
  toggle_all() {
    this.dbg('toggle_all', arguments)
    if (this.content.querySelector('.cloze.hide, .cloze-inactive.hide'))
      this.content.querySelectorAll('.cloze.hide, .cloze-inactive.hide')
        .forEach(el => { this.show(el as HTMLElement) })
    else
      this.content.querySelectorAll('.cloze:not(.hide), .cloze-inactive:not(.hide)')
        .forEach(el => { this.hide(el as HTMLElement) })
  }

  /** Iterate forward or backward, start by showing current if hidden */
  iter(fwd: boolean) {
    this.dbg('iter', arguments)
    const els = this.content.querySelectorAll('.cloze');
    let nxt
    if (this.current?.classList.contains('hide'))
      nxt = this.current
    if (fwd && this.current === els[els.length - 1])
      nxt = this.cfg.iteration.loop ? els[0] : this.current
    else if (!fwd && this.current === els[0])
      nxt = this.cfg.iteration.loop ? els[els.length - 1] : this.current
    for (let i = 0; !nxt && i < els.length; i++) {
      if (els[i] === this.current) nxt = els[i + (fwd ? 1 : -1)]
    }
    if (nxt !== this.current && this.cfg.iteration.hide)
      this.hide(this.current)
    this.show(this.current = nxt)
    this.scroll_to({ scroll: this.cfg.scroll.iterate, cloze: this.current })
  }

  /** Scroll to active clozes or specific cloze */
  scroll_to(opts: {scroll?: string, cloze?: HTMLElement, vp_pos?: number}) {
    this.dbg('scroll_to', arguments)

    // Special case: restore scroll position on back from saved front pos
    let vp_top
    if (!this.cfg.front && !isNaN(vp_top = parseFloat(sessionStorage.getItem('fc2_vp_top')!))) {
      sessionStorage.removeItem('fc2_vp_top')
      this.viewport.scrollTop = vp_top
    }

    if (opts.scroll === 'none') return

    let first, last
    if (opts.cloze) first = last = opts.cloze
    else {
      const active = this.content.querySelectorAll('.cloze')
      first = active[0]
      last = active[active.length - 1]
    }
    const offset = this.viewport.getBoundingClientRect().top // scroll area offset

    // Context scroll, either from preceding or HR/HX
    if (opts.scroll === 'context') {
      // Locate section start
      let section_top = offset, section, section_seen, cloze_seen
      const sections = this.content.querySelectorAll('hr, h1, h2, h3, h4, h5, h6, .cloze')
      for (let i = 0; i < sections.length; i++) {
        cloze_seen ||= sections[i].tagName === 'SPAN'
        section_seen ||= sections[i].tagName !== 'SPAN'
        if (!cloze_seen) section = sections[i]
        if (cloze_seen && (section || section_seen)) break
      }

      if (section) {
        section_top = section.tagName === 'HR'
          ? section.getBoundingClientRect().bottom
          : section.getBoundingClientRect().top - 5
      } else if (!section_seen) {
        // Use preceding inactive
        const all = this.content.querySelectorAll('.cloze, .cloze-inactive')
        for (let i = 1; i < all.length; i++) {
          if (all[i] === this.current) {
            section_top =  all[i - 1].getBoundingClientRect().bottom
            break
          }
        }
      }
      section_top -= offset
      this.dbg('   section_top', section_top)
      this.viewport.scrollTop = section_top
    } else {
      const line_height = (style: CSSStyleDeclaration) => {
        this.dbg('line_height')
        return parseInt(style.height) + parseInt(style.marginTop) + parseInt(style.marginBottom)
          || parseInt(style.lineHeight)
          || 20
      }
      const vp_height = this.viewport.clientHeight
      const top = (first.getBoundingClientRect().top - offset) - line_height(
        window.getComputedStyle(first?.previousElementSibling || first, ':before')
      ) + 3
      const bottom = (last.getBoundingClientRect().bottom - offset) + line_height(
        window.getComputedStyle(last?.nextElementSibling || last, ':after')
      ) + 3
      let y = 0

      if (opts.scroll === 'center') {
        if (bottom - top <= vp_height) y = top + (bottom - top) / 2 - vp_height / 2
        else y = top
      } else { // 'min'
        this.dbg('   vp_top', vp_top)
        this.dbg('   top', top)
        this.dbg('   bottom', bottom)
        if (top < vp_top) y = top
        // below
        else if (bottom > vp_top + vp_height) y = bottom - vp_height
        else y = vp_top
      }

      this.dbg('    scrolling to', this.viewport.scrollTop + y)
      this.viewport.scrollTop += y
    }
  }
}

declare var config: Configuration
declare var __TEMPLATE_SIDE__: 'front'|'back'
var fc2
fc2 ||= new FC2(config)
fc2.load(config, __TEMPLATE_SIDE__)

