interface Configuration {
    prompt: string          // Prompt when no hint
    hint: string            // %h is replaced with hint text
    expose: {
        char: string                      // Char to mark exposed cloze
        pos: 'pre'|'begin'|'end'|'post'   // Char pos
        reverse: boolean                  // If true exposed clozes are hidden, others shown
    }
    scroll: {
        initial: 'none'|'min'|'center'|'context' // Scoll on initial show
        click: 'none'|'min'|'center'|'context'   // Scroll on cloze click
        iterate: 'none'|'min'|'center'|'context' // Scroll on iteration
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
    debug: undefined|boolean|'error' // Debug information level (`false`, `'error'` or `true`)
}

declare var config: Configuration
declare var FC2_FRONT_SIDE: boolean

class FC2 {
  dbg: Function = () => {}
  expose: (el: HTMLElement) => boolean
  cfg: Configuration
  log: HTMLElement|null
  content: HTMLElement
  viewport: HTMLElement
  current: HTMLElement
  ordinal: number

  /** One-time runs */
  constructor(config: Configuration) {
      // Setup debug
      if (config.debug) this.setup_debug(config.debug)

      // Check for backend version
      if (document.querySelector('.cloze')?.['dataset']?.ordinal === undefined)
          return

      // Setup document level event handlers
      document.addEventListener("click", (evt: MouseEvent) => {
          const target = evt.target as HTMLElement
          // Cloze click handling
          if (target.classList!.contains('cloze')
              || target.classList.contains('cloze-inactive')) {
                  evt.stopPropagation() // To avoid toggling parents
                  if (!fc2.cfg.iteration.top) fc2.current = evt.target
                  fc2.toggle_cloze(evt.target)
                  fc2.scroll_to({scroll: fc2.cfg.scroll.click, cloze: evt.target})

          } // Additional content (header and actual content)
          else if (target.classList.contains('additional-header'))
              fc2.toggle_field(target.nextElementSibling)
          else if (target.classList.contains('additional-content'))
              fc2.toggle_field(evt.target)
          // Toggle all button
          else if (target.id === 'fc2-show-all-btn') fc2.toggle_all()
          // Nav bars
          else if (target.id === 'nav-toggle-all') fc2.toggle_all()
          else if (target.id === 'nav-prev-cloze') fc2.iter(false)
          else if (target.id === 'nav-next-cloze') fc2.iter(true)
      })

      document.addEventListener("keydown", (evt: KeyboardEvent) => {
          if (evt.key === fc2.cfg.shortcuts.next) {
              fc2.iter(true)
              evt.preventDefault()
          } else if (evt.key === fc2.cfg.shortcuts.previous) {
              fc2.iter(false)
              evt.preventDefault()
          } else if (evt.key === fc2.cfg.shortcuts.toggle_all) {
              fc2.toggle_all()
              evt.preventDefault()
          }
      })

      // Run side specifics
      this.load(config)
  }

  /** Done on each card/side */
  load(config: Configuration) {
      this.cfg = config
      this.content = document.getElementById('fc2-content')!
      this.viewport = document.getElementById('fc2-scroll-area')!
      this.current = this.content.querySelector('.cloze')!
      this.log = document.getElementById('fc2-log')

      this.ordinal ||= parseInt(this.current.dataset.ordinal!)
      this.expose = this.generate_expose()

      // Strip expose char from active clozes
      this.content.querySelectorAll('.cloze').forEach(this.expose as any)

      // Expose inactive clozes from expose char or containing active cloze
      this.content.querySelectorAll('.cloze-inactive').forEach(((cloze: HTMLElement) => {
          if (this.expose(cloze) || cloze.querySelector('.cloze'))
              cloze.classList.remove('cloze-inactive')
          else if (!this.cfg.show.inactive) this.hide(cloze)
      } ) as any)

      // Show additional fields per default depending on config
      if (!this.cfg.show.additional)
          this.viewport.querySelectorAll(':not(#info).additional-content')
          .forEach(nd => this.hide(nd))

      // Show info field per default depending on config
      if (!this.cfg.show.info)
          this.hide(document.querySelector('#info.additional-content'))

      // Reveal finished content, hide placeholder and scroll to first active cloze
      this.content.style.display = 'block'
      document.getElementById('fc2-content-placeholder')!.style.display = 'none'

      let y
      // Track scrolling on front
      if (FC2_FRONT_SIDE) {
          y = 0
          // If we could do this on unload it would be more efficient
          this.viewport.onscroll = (evt) =>
              sessionStorage.setItem('fc2_vp_top', this.viewport.scrollTop.toString())
      }
      // Or retrieve on back
      else y = parseFloat(sessionStorage.getItem('fc2_vp_top')!) || 0

      if (FC2_FRONT_SIDE) {
        this.content.querySelectorAll('.cloze').forEach(cloze => {
          this.hide(cloze)
        })
      }
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => this.scroll_to({scroll: this.cfg.scroll.initial, start_y: y})))
  }

  /** Initialize debug element and setup `this.dbg()` depending on config */
  setup_debug(debug) {
    // Capture errors
    window.onerror = (emsg, _src, _ln, _col, err) => {
      this.log ||= add_log_el()
      // @ts-expect-error: not undefined
      this.log.innerText += `error ${emsg}:\n${err['stack']}\n`
      this.log.scrollTop = this.log.scrollHeight
      return true
    }

    // Else noop
    if (debug === true) this.dbg = (str, args) => {
      this.log ||= add_log_el()
      let msg = str
      if (args && (typeof(args) === typeof(arguments) || typeof(args) === typeof([]))) {
          for (let i = 0; i < args.length; i++) {
              msg += i ? ', ' : ': '
              if (typeof(args[i]) == 'object') msg += JSON.stringify(args[i])
              else if (typeof(args[i]) == 'string') msg += `"${args[i]}"`
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
      // @ts-expect-error: not undefined
      document.getElementById('fc2-scroll-area').parentElement.appendChild(log)
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
      return this.cfg.expose.reverse ? (el) => {return !expose_(el)} : expose_
  }

  /** Hide cloze/field (and save cloze content PRN) */
  hide(el) {
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
  show(el) {
      this.dbg('show', arguments)
      if (!el || !el.classList.contains('hide')) return
      el.classList.remove('hide')
      // Done if additional field
      if (el.classList.contains('additional-content')) return
      el.innerHTML = el.dataset.cloze
      for (const child of el.querySelectorAll(':scope .cloze, :scope .cloze-inactive'))
          this.hide(child)
  }

  /** Toggle cloze visibility state */
  toggle_cloze(cloze) {
      this.dbg('toggle_cloze', arguments)
      cloze.classList.contains('hide') ? this.show(cloze) : this.hide(cloze)
  }

  /** Toggle field visibility state */
  toggle_field(field) {
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
          .forEach(el => { this.show(el) })
      else
          this.content.querySelectorAll('.cloze:not(.hide), .cloze-inactive:not(.hide)')
          .forEach(el => { this.hide(el) })
  }

  /** Iterate forward or backward, start by showing current if hidden */
  iter(fwd) {
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
      this.scroll_to({scroll: this.cfg.scroll.iterate, cloze: this.current})
  }

  /** Scroll to active clozes or specific cloze */
  scroll_to(opts) {
      this.dbg('scroll_to', arguments)
      if (opts.scroll === 'none') return

      window.requestAnimationFrame(() => {
          let first, last
          if (opts.cloze) first = last = opts.cloze
          else {
              const active = this.content.querySelectorAll('.cloze')
              first = active[0]
              last = active[active.length - 1]
          }

          const offset = this.viewport.offsetTop // offset from closest positioned parent top
          const vp_top = opts.start_y || 0
          const vp_height = this.viewport.clientHeight
          let top, bottom = (last.offsetTop - offset) + last.offsetHeight
          let y = 0

          // Context scroll, either from preceding or HR/HX
          if (opts.scroll === 'context') {
              // Find section
              let section
              if (this.content.querySelectorAll('hr, h1, h2, h3, h4, h5, h6').length) {
                  top = 0
                  for (const nd of this.content.querySelectorAll(
                      'hr, h1, h2, h3, h4, h5, h6, .cloze'
                  )) {
                      if (nd.tagName === 'SPAN') break
                      section = nd
                  }
                  if (section) {
                      top = section.tagName === 'HR'
                          ? section.offsetTop - offset + section.offsetHeight
                          : section.offsetTop - offset - 5
                  }
              } else {
                  // No sections found, use preceding inactive
                  const all = this.content.querySelectorAll('.cloze, .cloze-inactive') as NodeListOf<HTMLElement>
                  for (let i = 1; i < all.length && !top; i++)
                      if (all[i] === first)
                          top = all[i - 1].offsetTop - offset + all[i - 1].offsetHeight
              }
              y = FC2_FRONT_SIDE || bottom < top + vp_height
                  ? top
                  : bottom - vp_height // back side & doesn't fit, scroll min
          } else { // Not context, use one line margins
              top = first.offsetTop - offset - line_height.call(
                  this,
                  window.getComputedStyle(first?.previousElementSibling || first, ':before')
              ) + 3
              bottom += line_height.call(this, window.getComputedStyle(last?.nextElementSibling
                  || last, ':after')) + 3
              if (opts.scroll === 'min') {
                  // above
                  if (top < vp_top) y = top
                  // below
                  else if (bottom > vp_top + vp_height) y = bottom - vp_height
                  else y = vp_top // Scroll as on back we need to restore

              }  // center
              else y = top + (bottom - top) / 2 - vp_height / 2
          }

          this.dbg('offset', offset)
          this.dbg('vp_top', vp_top)
          this.dbg('y', y)
          this.viewport.scrollTo(0, y)
      })

      function line_height(style: CSSStyleDeclaration) {
          this.dbg('line_height')
          return parseInt(style.height) + parseInt(style.marginTop) + parseInt(style.marginBottom)
            || parseInt(style.lineHeight)
            || 20
      }
  }
}

var fc2
if(!fc2) fc2 = new FC2(config)
else fc2.load(config)