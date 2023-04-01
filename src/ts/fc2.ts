interface Configuration {
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
  show: {                 // `false` means initially collapsed/hidden
    inactive: boolean   // Inactive clozes
    additional: boolean // Additional fields (Note, Mnemonics etc.)
    info: boolean       // Information field
  }
  log: undefined|boolean|'error'    // Logging level (`false`, `'error'` or `true`)
  front?: boolean                   // Front or back side
}

// Avoid double declarations
var FC2

interface Logger {
  (str: string, args?: any): void
  element?: HTMLElement|null
}

interface Searcher {
  (): void
  match(str: string, nd: Node, res: Node[]): boolean
  panel: HTMLElement
  field: HTMLInputElement
  str: string|undefined
  matches: HTMLElement[]
  index: number
  show(): void
  hide(): void
}

FC2 ||= class {
  log!: Logger
  expose!: (el: HTMLElement) => boolean
  cfg!: Configuration
  content!: HTMLElement
  search!: Searcher
  viewport!: HTMLElement
  current!: HTMLElement
  ordinal!: number

  /** One-time runs */
  constructor(config: Configuration) {
    // Setup logging
    if (config.log) this.log = this.logger(config.log)
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
      else if (target.id === 'fc2-show-all-btn') {
        this.toggle_all()
          ? this.search.show()
          : this.search.hide()
      }
      // Nav bars
      else if (target.id === 'nav-toggle-all') {
        this.toggle_all()
          ? this.search.show()
          : this.search.hide()
      }
      else if (target.id === 'nav-prev-cloze') this.iter(false)
      else if (target.id === 'nav-next-cloze') this.iter(true)
    })

    document.addEventListener("keydown", (evt: KeyboardEvent) => {
      if (document.activeElement === this.search?.field) return
      if (evt.key === this.cfg.shortcuts.next) {
        this.iter(true)
        evt.preventDefault()
      } else if (evt.key === this.cfg.shortcuts.previous) {
        this.iter(false)
        evt.preventDefault()
      } else if (evt.key === this.cfg.shortcuts.toggle_all) {
        this.toggle_all()
          ? this.search.show()
          : this.search.hide()
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
    this.search = this.searcher()
    this.current = this.content.querySelector('.cloze')!

    this.ordinal ||= parseInt(this.current.dataset.ordinal!)
    this.expose = this.generate_expose()

    // Setup class lists
    this.content.parentElement!.classList.remove(this.cfg.front ? 'back' : 'front')
    this.content.parentElement!.classList.add(this.cfg.front ? 'front' : 'back')

    // Parse note specific config from tags
    const tag_el = document.querySelector('#fc2-additional #tags') as HTMLElement
    if (tag_el) {
      for (const tag of tag_el.innerText.split(' ').slice(1)) {
        if (!tag.startsWith('fc2.cfg.')) continue
        const parts = tag.slice(8).split('.')
        const tag_side = ['front', 'back'].includes(parts[0]) ? parts.shift() : undefined
        if (tag_side && tag_side !== side || this.cfg[parts[0]]?.[parts[1]] === undefined)
          continue
        typeof(this.cfg[parts[0]][parts[1]]) === 'boolean'
          ? parts[2] === 'true'
          : parts.slice(2)
      }
    }

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
        sessionStorage.setItem('fc2_scroll_top', this.viewport.scrollTop.toString())

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
  logger(lvl: boolean|undefined|'error') {
    let log: Logger = () => {}
    if (lvl) {
      if (lvl === true) {
        log = (str: string, args: any) => {
          if (log.element!.hidden) log.element!.hidden = false
          let msg = str
          if (args && (typeof (args) === typeof (arguments) || typeof (args) === typeof ([]))) {
            for (let i = 0; i < args.length; i++) {
              msg += i ? ', ' : ': '
              if (typeof (args[i]) == 'object') msg += JSON.stringify(args[i])
              else if (typeof (args[i]) == 'string') msg += `"${args[i]}"`
              else msg += args[i]
            }
          } else if (args) msg += `: ${args}`
          log.element!.innerText += `${msg}\n`
          log.element!.scrollTop = log.element!.scrollHeight
        }
      }

      // Capture errors
      window.onerror = (emsg, _src, _ln, _col, err) => {
        if (log.element!.hidden) log.element!.hidden = false
        log.element!.innerText += `error ${emsg}:\n${err!.stack}\n`
        log.element!.scrollTop = log.element!.scrollHeight
        return true
      }

      log.element = document.createElement('pre')
      log.element.id = 'fc2-log'
      log.element.hidden = true
      log.element = document.getElementById('fc2-scroll-area')?.parentElement?.appendChild(log.element)
    }

    return log
  }

  searcher() {
    const searchfn = (() => {
      /** Recurse node to find deepest matches */
      searchfn.match = (str: string, nd: Node, res: Node[]) => {
        this.log('searchfn.match')
        let found = false
        for (const child of nd.childNodes) found = searchfn.match(str, child, res) || found
        if (!found && nd['innerText']?.indexOf(str) >= 0) {
          found = true
          res.push(nd)
        }
        return found
      }

      if (!searchfn.field?.value) return
      // No current matches or changed search string
      if (!searchfn.matches?.length || searchfn.field.value !== searchfn.str) {
        this.log('searchfn.searching')
        for (const el of searchfn.matches) el.classList.remove('search-match')
        searchfn.matches = []
        searchfn.index = -1
        searchfn.match(searchfn.field.innerText, this.content, searchfn.matches)
        for (const el of searchfn.matches) el.classList.add('search-match')
      }

      // Scroll to next match
      if (searchfn.matches?.length) {
        searchfn.index = searchfn.index === searchfn.matches.length - 1
          ? 0
          : searchfn.index! + 1
          this.log(`  searchfn found match, scrolling to index ${searchfn.index}`)
          searchfn.matches[searchfn.index].scrollIntoView()
      }
    }) as Searcher
    searchfn.matches = []
    searchfn.index = -1

    const panel = document.createElement('div')
    panel.id = 'fc2-search'
    panel.hidden = true
    panel.innerHTML = '<input type="text" id="fc2-search-field" placeholder="Type to search"/><div id="fc2-search-btn" onclick="fc2.search();">SEARCH</div>'
    searchfn.panel = document.getElementById('fc2-scroll-area')!.parentElement!.appendChild(panel)
    searchfn.field = document.getElementById('fc2-search-field') as HTMLInputElement

    searchfn.show = () => {
      fc2.log('searcher.show')
      searchfn.panel!.hidden = false
      searchfn.field!.focus()
    }
    searchfn.hide = () => {
      fc2.log('searcher.hide')
      for (const nd of searchfn.matches) nd.classList.remove('search-match')
      searchfn.panel!.hidden = true
    }

    return searchfn
  }

  /** Create expose function from config */
  generate_expose(): (el: HTMLElement) => boolean {
   this.log('generate_expose', arguments)
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
   this.log('hide', arguments)
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
   this.log('show', arguments)
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
   this.log('toggle_cloze', arguments)
    cloze.classList.contains('hide') ? this.show(cloze) : this.hide(cloze)
  }

  /** Toggle field visibility state */
  toggle_field(field: HTMLElement) {
   this.log('toggle_field', arguments)
    field.classList.contains('hide')
      ? field.classList.remove('hide')
      : field.classList.add('hide')
  }

  /** Toggle all clozes and fields, sync towards show */
  toggle_all() {
   this.log('toggle_all', arguments)
    if (this.content.querySelector('.cloze.hide, .cloze-inactive.hide')) {
      this.content.querySelectorAll('.cloze.hide, .cloze-inactive.hide')
        .forEach(el => { this.show(el as HTMLElement) })
      return true
    }
    else {
      this.content.querySelectorAll('.cloze:not(.hide), .cloze-inactive:not(.hide)')
        .forEach(el => { this.hide(el as HTMLElement) })
      return false
    }
  }

  /** Iterate forward or backward, start by showing current if hidden */
  iter(fwd: boolean) {
   this.log('iter', arguments)
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
  scroll_to(opts: {scroll: string, cloze?: HTMLElement, vp_pos?: number}) {
   this.log('scroll_to', arguments)

    // Special case: restore scroll position on back from saved front pos
    if (!this.cfg.front) {
      const scroll_top = parseFloat(sessionStorage.getItem('fc2_scroll_top')!)
      if (!isNaN(scroll_top)) {
        sessionStorage.removeItem('fc2_scroll_top')
        this.viewport.scrollTop = scroll_top
      }
    }

    if (opts.scroll === 'none') return

    let first, last
    if (opts.cloze) first = last = opts.cloze
    else {
      const active = this.content.querySelectorAll('.cloze')
      first = active[0]
      last = active[active.length - 1]
    }
    const offset = this.viewport.getBoundingClientRect().top
    const line_height = (style: CSSStyleDeclaration) => {
     this.log('line_height')
      return parseInt(style.height) + parseInt(style.marginTop) + parseInt(style.marginBottom)
        || parseInt(style.lineHeight)
        || 20
    }
    const vp_height = this.viewport.clientHeight
    const cloze_top = (first.getBoundingClientRect().top - offset) - line_height(
      window.getComputedStyle(first?.previousElementSibling || first, ':before')
    ) + 3 // top of first active cloze
    let top // top of area to visualize, section or first active cloze
    const bottom = (last.getBoundingClientRect().bottom - offset) + line_height(
      window.getComputedStyle(last?.nextElementSibling || last, ':after')
    ) + 3 // bottom of area to visualize, last active cloze
    let y = 0 // offset to scroll, not absolute y coordinate

    // context scroll, locate section start for top - either HR/Hn or preceding cloze
    if (opts.scroll?.slice(0, 7) === 'context') {
      top = 0 // nothing found assume context it is start of card
      let section, section_seen, cloze_seen
      const sections = this.content.querySelectorAll('hr, h1, h2, h3, h4, h5, h6, .cloze')
      for (let i = 0; i < sections.length; i++) {
        cloze_seen ||= sections[i].tagName === 'SPAN'
        section_seen ||= sections[i].tagName !== 'SPAN'
        if (!cloze_seen) section = sections[i]
        if (cloze_seen && (section || section_seen)) break
      }
      if (section) {
        top = section.tagName === 'HR'
          ? (section.getBoundingClientRect().bottom - offset)
          : (section.getBoundingClientRect().top - offset) - 5
      } else if (!section_seen) { // Use preceding inactive cloze or 0
        const all = this.content.querySelectorAll('.cloze, .cloze-inactive')
        for (let i = 1; i < all.length; i++) {
          if (all[i] === this.current) {
            top =  (all[i - 1].getBoundingClientRect().top - offset) - 5
            break
          }
        }
      }
    }
    // no context, top is first active cloze
    else top = cloze_top

    if (['center', 'context', 'context-bottom'].includes(opts.scroll)) {
      // entire area will fit
      if (bottom - top <= vp_height) opts.scroll === 'context-bottom'
        ? y = bottom - vp_height
        : y = top + (bottom - top) / 2 - vp_height / 2
      // won't fit on front, start from top
      else if (this.cfg.front) y = top
      // won't fit on back, get first cloze into view and try to get last as well
      else y = bottom - cloze_top <= vp_height
        ? bottom - vp_height
        : cloze_top
    } else { // 'min'
      // first is above the viewport or all won't fit
      if (cloze_top < 0 || bottom - top >= vp_height) y = cloze_top
      // last is below the viewport
      else if (bottom > vp_height) y = bottom - vp_height
    }

   this.log(`    scrolling ${opts.scroll} to`, this.viewport.scrollTop + y)
    if (y) this.viewport.scrollTop += y
  }
}

declare var config: Configuration
declare var __TEMPLATE_SIDE__: 'front'|'back'
var fc2
fc2 ||= new FC2(config)
fc2.load(config, __TEMPLATE_SIDE__)

