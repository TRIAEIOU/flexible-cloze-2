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

interface Logger {
  (str: string, args?: any): void
  element?: HTMLElement|null
}

interface Searcher {
  (): void
  clear(): void
  show(): void
  hide(): void
  scroll: HTMLElement
  content: HTMLElement
  panel: HTMLElement
  field: HTMLInputElement
  button: HTMLElement
  sstr: string
  matches: HTMLElement[]
  index: number
}

interface FC2 {
  cfg: Configuration
  log: Logger
  search: Searcher
  content: HTMLElement
  viewport: HTMLElement
  current: HTMLElement
  ordinal: number
  (config: Configuration, side: 'front'|'back'): void
  expose(el: HTMLElement): boolean
  logger(parent: HTMLElement, lvl: boolean|undefined|'error'): Logger
  searcher(scroll: HTMLElement, content: HTMLElement): Searcher
  toggle_cloze(cloze: HTMLElement): void
  scroll_to(opts: {scroll: string, cloze?: HTMLElement, vp_pos?: number}): void
  toggle_field(field: HTMLElement): void
  toggle_all(show?: boolean): boolean
  iter(fwd: boolean): void
  generate_expose(): (el: HTMLElement) => boolean
  show(el: HTMLElement): void
  hide(el: HTMLElement): void
  mouse(evt: MouseEvent): void
  keyboard(evt: KeyboardEvent): void
}

declare var config: Configuration
declare var __TEMPLATE_SIDE__: 'front'|'back'
var fc2
fc2 ||= ((config: Configuration) => {
  /** Default action is side init (done on each card/side) */
  const self = ((config: Configuration, side: 'front'|'back') => {
    // Setup logging
    self.log = self.logger(document.getElementById('fc2-scroll-area')!.parentElement!, config.log)
    self.cfg = config
    self.cfg.front = side === 'front'
    self.content = document.getElementById('fc2-content')!
    self.viewport = document.getElementById('fc2-scroll-area')!
    self.search = self.searcher(self.viewport, self.content)
    self.current = self.content.querySelector('.cloze')!

    self.ordinal ||= parseInt(self.current.dataset.ordinal!)
    self.expose = self.generate_expose()

    // Setup class lists
    self.content.parentElement!.classList.remove(self.cfg.front ? 'back' : 'front')
    self.content.parentElement!.classList.add(self.cfg.front ? 'front' : 'back')

    // Parse note specific config from tags
    const tag_el = document.querySelector('#fc2-additional #tags') as HTMLElement
    if (tag_el) {
      for (const tag of tag_el.innerText.split(' ').slice(1)) {
        if (!tag.startsWith('fc2.cfg.')) continue
        const parts = tag.slice(8).split('.')
        const tag_side = ['front', 'back'].includes(parts[0]) ? parts.shift() : undefined
        if (tag_side && tag_side !== side || self.cfg[parts[0]]?.[parts[1]] === undefined)
          continue
        typeof(self.cfg[parts[0]][parts[1]]) === 'boolean'
          ? parts[2] === 'true'
          : parts.slice(2)
      }
    }

    // Strip expose char from active clozes and hide if front
    self.content.querySelectorAll('.cloze').forEach(((cloze: HTMLElement) => {
      self.expose(cloze)
      if (self.cfg.front) self.hide(cloze)
    }) as any)

    // Expose inactive clozes from expose char or containing active cloze
    self.content.querySelectorAll('.cloze-inactive').forEach(((cloze: HTMLElement) => {
      if (self.expose(cloze) || cloze.querySelector('.cloze'))
        cloze.classList.remove('cloze-inactive')
      else if (!self.cfg.show.inactive) self.hide(cloze)
    }) as any)

    // Show additional fields per default depending on config
    if (!self.cfg.show.additional)
      self.viewport.querySelectorAll(':not(#info).additional-content')
        .forEach(nd => self.hide(nd as HTMLElement))

    // Show info field per default depending on config
    if (!self.cfg.show.info)
      self.hide(document.querySelector('#info.additional-content') as HTMLElement)

    // Track scrolling on front, on unload would be more efficient
    if (self.cfg.front) self.viewport.onscroll = (_evt) =>
        sessionStorage.setItem('fc2_scroll_top', self.viewport.scrollTop.toString())

    // Setup document level event handlers - should not be added if already there
    document.addEventListener("click", self.mouse)
    document.addEventListener("keydown", self.keyboard)

    // Reveal finished content, hide placeholder and scroll to first active cloze
    self.content.style.display = 'block'
    document.getElementById('fc2-content-placeholder')!.style.display = 'none'
    // Stacked requests as AnkiDroid takes a few frames to finish layout
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() =>
          self.scroll_to({scroll: self.cfg.scroll.initial})
        )
      )
    )
  }) as FC2

  /** Initialize debug element and setup `self.log()` depending on config */
  self.logger = (parent: HTMLElement, lvl: boolean|undefined|'error') => {
    let log: Logger = () => {}
    if (lvl) {
      if (lvl === true) {
        log = (str: string, args: any) => {
          if (log.element!.hidden) log.element!.hidden = false
          let msg = str
          if (typeof(args) === 'object') {
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
      log.element = parent.appendChild(log.element)
    }

    return log
  }

  /**
   * Initializes and returns search function interface, default method is search
   * Credit Julien Grégoire: https://stackoverflow.com/questions/58553501/how-to-highlight-search-text-from-string-of-html-content-without-breaking
   */
  self.searcher = (scroll: HTMLElement, content: HTMLElement) => {
    // Setup search function (default method)
    const fn = (() => {
      // Nothing in search field - clear
      if (!fn.field?.value) {
        fn.clear()
        return
      }

      // Changed search string, clear old and create new searh
      if (fn.field.value !== fn.sstr) {
        fn.clear()
        fn.sstr = fn.field.value
        highlight(RegExp(fn.sstr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'gi'))
      }

      // If we have matches, clear previous highlight, highlight next and scroll
      if (fn.matches?.length) {
        if (fn.index >= 0)
          fn.matches[fn.index].classList.replace('search-match', 'search-matches')
        fn.index = fn.index < fn.matches.length - 1
          ? fn.index + 1
          : 0
        fn.matches[fn.index].classList.replace('search-matches', 'search-match')
        fn.matches[fn.index].scrollIntoView(
          {behavior: 'auto', block: 'center', inline: 'nearest'}
        )
      }

      function highlight(re: RegExp) {
        const txt = fn.content.textContent!
        const rct = fn.scroll.getBoundingClientRect()
        const stl = getComputedStyle(fn.content)
        const offset = {
          top: fn.scroll.scrollTop - rct.top - parseFloat(stl.marginTop),
          left: fn.scroll.scrollLeft - rct.left - parseFloat(stl.marginLeft)
        }
        let match, sstr = fn.field.value
        const sel = window.getSelection()!
        sel.removeAllRanges()
        // to handle multiple result you need to go through all matches
        while (match = re.exec(txt)) {
          const itr = nd_itr(fn.content)
          let index = 0
          // the result is the text node, so you can iterate and compare the index you are searching to all text nodes length
          let res = itr.next()

          while (!res.done) {
            let rng
            if (match.index >= index && match.index < index + res.value.length) {
              // when we have the correct node and index we add a range
              rng = new Range()
              rng.setStart(res.value, match.index - index)
            }
            if (
              match.index + sstr.length >= index &&
              match.index + sstr.length < index + res.value.length
            ) {
              // when we find the end node, we can set the range end
              rng.setEnd(res.value, match.index + sstr.length - index)
              sel.addRange(rng)
              // this is where we add the divs based on the client rects of the range
              for (const rect of rng.getClientRects()) {
                const light = document.createElement('DIV')
                light.innerText = rng.toString()
                fn.content.appendChild(light)
                light.classList.add('search-matches')
                light.style.top = rect.y + offset.top + 'px'
                light.style.left = rect.x  + offset.left + 'px'
                light.style.height = rect.height + 'px'
                light.style.width = rect.width + 'px'
                fn.matches.push(light)
              }
            }
            index += res.value.length
            res = itr.next()
          }
        }
        sel.removeAllRanges()
      }

      /** Iterate all descendents */
      function* nd_itr(nd: Node) {
        for (const cnd of nd.childNodes) {
          if (cnd.nodeType === Node.TEXT_NODE) yield cnd
          else yield* nd_itr(cnd)
        }
      }
    }) as Searcher

    /** Remove all highlighing */
    fn.clear = () => {
      for (const el of fn.matches) el.remove()
      fn.index = -1, fn.sstr = '', fn.matches = []
    }

    // Init vars
    fn.scroll = scroll, fn.content = content
    fn.matches = [], fn.index = -1, fn.sstr = ''

    // Setup panel
    const panel = document.createElement('div')
    panel.id = 'fc2-search'
    panel.hidden = true
    panel.innerHTML = '<input type="text" id="fc2-search-field" placeholder="Search for text"/><div id="fc2-search-btn" tabindex="0" onclick="fc2.log(`click!`); fc2.search();">Search</div>'
    fn.panel = document.getElementById('fc2-scroll-area')!.parentElement!.appendChild(panel)
    fn.field = document.getElementById('fc2-search-field') as HTMLInputElement
    fn.field.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter') {
        fn()
        // For some reason keyboard input is lost on Desktop so we need to reset it
        fn.button.focus() // On mobile we want to hide keyboard and use button
        if (!document.documentElement.classList.contains('mobile')) fn.field.focus()
      } else if (evt.key === 'Escape') fn.hide()
      evt.stopPropagation()
    })
    fn.button = document.getElementById('fc2-search-btn') as HTMLDivElement

    // Methods
    /** Show search bar */
    fn.show = () => {
      fn.panel.hidden = false
      fn.field.select()
      fn.field.focus()
    }

    /** Hide search panel */
    fn.hide = () => {
      fn.clear()
      fn.panel.hidden = true
    }

    return fn
  }

  /** Create expose function from config */
  self.generate_expose = () => {
   self.log('generate_expose')
    let expose_
    if (self.cfg.expose.pos === 'pre') {
      expose_ = (el) => {
        if (el.previousSibling?.data?.endsWith(self.cfg.expose.char))
          el.previousSibling.data = el.previousSibling.data.slice(0, -1)
        else return false
        return true
      }
    } else if (self.cfg.expose.pos === 'post') {
      expose_ = (el) => {
        if (el.nextSibling?.data?.startsWith(self.cfg.expose.char))
          el.nextSibling.data = el.nextSibling.data.substring(1)
        else return false
        return true
      }
    } else if (self.cfg.expose.pos === 'end') {
      expose_ = (el) => {
        if (el.dataset.cloze?.endsWith(self.cfg.expose.char))
          el.dataset.cloze = el.dataset.cloze.slice(0, -1)
        else if (el.lastChild?.data?.endsWith(self.cfg.expose.char))
          el.lastChild.data = el.lastChild.data.slice(0, -1)
        else return false
        return true
      }
    } else {
      expose_ = (el) => { // begin
        if (el.dataset.cloze?.startsWith(self.cfg.expose.char))
          el.dataset.cloze = el.dataset.cloze.substring(1)
        else if (el.firstChild?.data?.startsWith(self.cfg.expose.char))
          el.firstChild.data = el.firstChild.data.substring(1)
        else return false
        return true
      }
    }
    return self.cfg.expose.reverse ? (el) => { return !expose_(el) } : expose_
  }

  /** Show cloze/field (and save cloze hint PRN) */
  self.show = (el: HTMLElement) => {
    self.log('show', el.tagName)
     if (!el?.classList.contains('hide')) return
     el.classList.remove('hide')
     // Done if additional field
     if (el.classList.contains('additional-content')) return
     el.innerHTML = el.dataset.cloze!
     for (const child of el.querySelectorAll(':scope .cloze, :scope .cloze-inactive'))
       self.hide(child as HTMLElement)
   }

   /** Hide cloze/field (and save cloze content PRN) */
  self.hide = (el: HTMLElement) => {
   self.log('hide')
    if (!el || el.classList.contains('hide')) return
    el.classList.add('hide')
    // Done if additional field
    if (el.classList.contains('additional-content')) return
    // Store cloze content and hint PRN
    if (el.dataset.cloze === undefined) el.dataset.cloze = el.innerHTML
    // Store hint PRN and possible
    if (el.dataset.hint === undefined) {
      if (el.innerHTML === '[...]' || el.classList.contains('cloze-inactive'))
        el.dataset.hint = self.cfg.prompt
      else
        el.dataset.hint = "" // self should try to parse hint from content and format?
    }
    el.innerHTML = el.dataset.hint
  }

  /** Iterate forward or backward, start by showing current if hidden */
  self.iter = (fwd: boolean) => {
    self.log('iter')
    const els = self.content.querySelectorAll('.cloze');
    let nxt
    if (self.current?.classList.contains('hide'))
      nxt = self.current
    if (fwd && self.current === els[els.length - 1])
      nxt = self.cfg.iteration.loop ? els[0] : self.current
    else if (!fwd && self.current === els[0])
      nxt = self.cfg.iteration.loop ? els[els.length - 1] : self.current
    for (let i = 0; !nxt && i < els.length; i++) {
      if (els[i] === self.current) nxt = els[i + (fwd ? 1 : -1)]
    }
    if (nxt !== self.current && self.cfg.iteration.hide)
      self.hide(self.current)
    self.show(self.current = nxt)
    self.scroll_to({ scroll: self.cfg.scroll.iterate, cloze: self.current })
  }

  /** Toggle cloze visibility state */
  self.toggle_cloze = (cloze: HTMLElement) => {
    self.log('toggle_cloze')
    cloze.classList.contains('hide') ? self.show(cloze) : self.hide(cloze)
  }

  /** Toggle field visibility state */
  self.toggle_field = (field: HTMLElement) => {
   self.log('toggle_field')
    field.classList.contains('hide')
      ? field.classList.remove('hide')
      : field.classList.add('hide')
  }

  /** Toggle all clozes and fields, sync towards show or force */
  self.toggle_all = (show: boolean|undefined = undefined) => {
    self.log('toggle_all')
    if (show === true || (
        (show === undefined) &&
        self.content.querySelector('.cloze.hide, .cloze-inactive.hide')
    )) {
      self.content.querySelectorAll('.cloze.hide, .cloze-inactive.hide')
        .forEach(el => { self.show(el as HTMLElement) })
      return true
    }
    else {
      self.content.querySelectorAll('.cloze:not(.hide), .cloze-inactive:not(.hide)')
        .forEach(el => { self.hide(el as HTMLElement) })
      return false
    }
  }

  /** Scroll to active clozes or specific cloze */
  self.scroll_to = (opts: {scroll: string, cloze?: HTMLElement, vp_pos?: number}) => {
   self.log('scroll_to')

    // Special case: restore scroll position on back from saved front pos
    if (!self.cfg.front) {
      const scroll_top = parseFloat(sessionStorage.getItem('fc2_scroll_top')!)
      if (!isNaN(scroll_top)) {
        sessionStorage.removeItem('fc2_scroll_top')
        self.viewport.scrollTop = scroll_top
      }
    }

    if (opts.scroll === 'none') return

    let first, last
    if (opts.cloze) first = last = opts.cloze
    else {
      const active = self.content.querySelectorAll('.cloze')
      first = active[0]
      last = active[active.length - 1]
    }
    const offset = self.viewport.getBoundingClientRect().top
    const line_height = (style: CSSStyleDeclaration) => {
     self.log('line_height')
      return parseInt(style.height) + parseInt(style.marginTop) + parseInt(style.marginBottom)
        || parseInt(style.lineHeight)
        || 20
    }
    const vp_height = self.viewport.clientHeight
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
      const sections = self.content.querySelectorAll('hr, h1, h2, h3, h4, h5, h6, .cloze')
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
        const all = self.content.querySelectorAll('.cloze, .cloze-inactive')
        for (let i = 1; i < all.length; i++) {
          if (all[i] === self.current) {
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
      else if (self.cfg.front) y = top
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

   self.log(`    scrolling ${opts.scroll} to`, self.viewport.scrollTop + y)
    if (y) self.viewport.scrollTop += y
  }

  /** Handle document level mouse events */
  self.mouse = (evt: MouseEvent) => {
    const target = evt.target as HTMLElement
    // Cloze click handling
    if (target.classList!.contains('cloze')
      || target.classList.contains('cloze-inactive')) {
      evt.stopPropagation() // To avoid toggling parents
      if (!self.cfg.iteration.top) self.current = evt.target as HTMLElement
      self.toggle_cloze(evt.target as HTMLElement)
      self.scroll_to({ scroll: self.cfg.scroll.click, cloze: evt.target as HTMLElement })

    } // Additional content (header and actual content)
    else if (target.classList.contains('additional-header'))
      self.toggle_field(target.nextElementSibling as HTMLElement)
    else if (target.classList.contains('additional-content'))
      self.toggle_field(evt.target as HTMLElement)
    // Toggle all button
    else if (target.id === 'fc2-show-all-btn') {
      self.toggle_all()
        ? self.search.show()
        : self.search.hide()
    }
    // Nav bars
    else if (target.id === 'nav-toggle-all') {
      self.toggle_all()
        ? self.search.show()
        : self.search.hide()
    }
    else if (target.id === 'nav-prev-cloze') self.iter(false)
    else if (target.id === 'nav-next-cloze') self.iter(true)
  }

  /** Handle document level keyboard events */
  self.keyboard = (evt: KeyboardEvent) => {
    if (evt.key === 'Escape' && !self.search.panel.hidden) {
      self.search.hide()
      evt.stopImmediatePropagation()
      evt.preventDefault()
    }
    else if (evt.key === self.cfg.shortcuts.next) self.iter(true)
    else if (evt.key === self.cfg.shortcuts.previous) self.iter(false)
    else if (evt.key === self.cfg.shortcuts.toggle_all)
      self.toggle_all()
        ? self.search.show()
        : self.search.hide()
    else if (evt.key === 'f' && evt.ctrlKey && !evt.metaKey) {
      if (self.search.panel.hidden) {
        self.toggle_all(true)
        self.search.show()
      } else self.search.field.focus()
    }
  }

  // Check for backend version
  return document.querySelector('.cloze')!['dataset'].ordinal !== undefined
    ? self
    : null
})(config)

fc2(config, __TEMPLATE_SIDE__)