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
  highlight(re: RegExp): void
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
  expose: (el: HTMLElement) => boolean
  content: HTMLElement
  viewport: HTMLElement
  current: HTMLElement
  ordinal: number
  load(config: Configuration, side: 'front'|'back'): void
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

var fc2
if (!fc2 && document.querySelector('.cloze')!['dataset'].ordinal !== undefined) {
  fc2 = class {
    cfg!: Configuration
    log!: Logger
    search!: Searcher
    expose!: (el: HTMLElement) => boolean;
    content!: HTMLElement
    viewport!: HTMLElement
    current!: HTMLElement
    ordinal!: number

    /** Initialize debug element and setup `this.log()` depending on config */
    logger(parent: HTMLElement, lvl: boolean|undefined|'error') {
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
        log.element.id = 'log-panel'
        log.element.hidden = true
        log.element = parent.appendChild(log.element)
      }

      return log
    }

    /** Default action is side init (done on each card/side) */
    load(config: Configuration, side: 'front'|'back') {
      // Setup logging
      this.log = this.logger(document.getElementById('fc2-scroll-area')!.parentElement!, config.log)
      this.cfg = config
      this.cfg.front = side === 'front'
      this.content = document.getElementById('fc2-content')!
      this.viewport = document.getElementById('fc2-scroll-area')!
      this.search = this.searcher(this.viewport, this.content)
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

      // Setup document level event handlers - should not be added if already there
      document.addEventListener("click", this.mouse)
      document.addEventListener("keydown", this.keyboard)

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

    /** Create expose function from config */
    generate_expose() {
    this.log('generate_expose')
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

    /** Show cloze/field (and save cloze hint PRN) */
    show(el: HTMLElement) {
      this.log('show', el.tagName)
      if (!el?.classList.contains('hide')) return
      el.classList.remove('hide')
      // Done if additional field
      if (el.classList.contains('additional-content')) return
      el.innerHTML = el.dataset.cloze!
      for (const child of el.querySelectorAll(':scope .cloze, :scope .cloze-inactive'))
        this.hide(child as HTMLElement)
    }

    /** Hide cloze/field (and save cloze content PRN) */
    hide(el: HTMLElement) {
    this.log('hide')
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
          el.dataset.hint = "" // this should try to parse hint from content and format?
      }
      el.innerHTML = el.dataset.hint
    }

    /** Iterate forward or backward, start by showing current if hidden */
    iter(fwd: boolean) {
      this.log('iter')
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

    /** Toggle cloze visibility state */
    toggle_cloze(cloze: HTMLElement) {
      this.log('toggle_cloze')
      cloze.classList.contains('hide') ? this.show(cloze) : this.hide(cloze)
    }

    /** Toggle field visibility state */
    toggle_field(field: HTMLElement) {
    this.log('toggle_field')
      field.classList.contains('hide')
        ? field.classList.remove('hide')
        : field.classList.add('hide')
    }

    /** Toggle all clozes and fields, sync towards show or force */
    toggle_all(show: boolean|undefined = undefined) {
      this.log('toggle_all')
      if (show === true || (
          (show === undefined) &&
          this.content.querySelector('.cloze.hide, .cloze-inactive.hide')
      )) {
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

    /** Scroll to active clozes or specific cloze */
    scroll_to(opts: {scroll: string, cloze?: HTMLElement, vp_pos?: number}) {
    this.log('scroll_to')

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

    /**
     * Initializes and returns search function interface, default method is search
     * Credit Julien Grégoire: https://stackoverflow.com/questions/58553501/how-to-highlight-search-text-from-string-of-html-content-without-breaking
     */
    searcher(scroll: HTMLElement, content: HTMLElement) {
      // Setup search function (default method)
      const fn = (() => {
        this.log('searcher()')
        // Nothing in search field - clear
        if (!fn.field?.value) {
          fn.clear()
          return
        }

        // Changed search string, clear old and create new searh
        if (fn.field.value !== fn.sstr) {
          fn.clear()
          fn.sstr = fn.field.value
          fn.highlight(RegExp(fn.sstr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'gi'))
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

        fn.highlight = (re: RegExp) => {
          this.log('searcher.highlight()')
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
        this.log('searcher.clear()')
        for (const el of fn.matches) el.remove()
        fn.index = -1, fn.sstr = '', fn.matches = []
      }

      // Init vars
      fn.scroll = scroll, fn.content = content
      fn.matches = [], fn.index = -1, fn.sstr = ''

      // Setup panel
      const panel = document.createElement('div')
      panel.id = 'search-panel'
      panel.hidden = true
      panel.innerHTML = '<input type="text" id="search-field" placeholder="Search for text"/><div id="search-btn" tabindex="0">Search</div>'
      fn.panel = scroll.parentElement!.appendChild(panel)
      fn.field = document.getElementById('search-field') as HTMLInputElement
      fn.field.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') {
          fn()
          // For some reason keyboard input is lost on Desktop so we need to reset it
          fn.button.focus() // On mobile we want to hide keyboard and use button
          if (!document.documentElement.classList.contains('mobile')) fn.field.focus()
        } else if (evt.key === 'Escape') fn.hide()
        evt.stopPropagation()
      })
      fn.button = document.getElementById('search-btn') as HTMLDivElement
      fn.button.onclick = fn

      // Methods
      /** Show search bar */
      fn.show = () => {
        this.log('searcher.show()')
        fn.panel.hidden = false
        fn.field.select()
        fn.field.focus()
      }

      /** Hide search panel */
      fn.hide = () => {
        this.log('searcher.hide()')
        fn.clear()
        fn.panel.hidden = true
      }

      return fn
    }

    /** Handle document level mouse events */
    mouse(evt: MouseEvent) {
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
    }

    /** Handle document level keyboard events */
    keyboard(evt: KeyboardEvent) {
      if (evt.key === 'Escape' && !this.search.panel.hidden) {
        this.search.hide()
        evt.stopImmediatePropagation()
        evt.preventDefault()
      }
      else if (evt.key === this.cfg.shortcuts.next) this.iter(true)
      else if (evt.key === this.cfg.shortcuts.previous) this.iter(false)
      else if (evt.key === this.cfg.shortcuts.toggle_all)
        this.toggle_all()
          ? this.search.show()
          : this.search.hide()
      else if (evt.key === 'f' && evt.ctrlKey && !evt.metaKey) {
        if (this.search.panel.hidden) {
          this.toggle_all(true)
          this.search.show()
        } else this.search.field.focus()
      }
    }
  }
}

declare var config: Configuration
declare var __TEMPLATE_SIDE__: 'front'|'back'
fc2.load(config, __TEMPLATE_SIDE__)