import {logger} from './logger'
import type { Logger } from './logger'
import {Searcher} from './searcher'
import type { Configuration } from './configuration'

export class FC2 {
  cfg!: Configuration
  log!: Logger
  search!: Searcher
  expose!: (el: HTMLElement) => boolean;
  content!: HTMLElement
  viewport!: HTMLElement
  current!: HTMLElement
  ordinal!: number
  listeners = false

  /** Load/parse (done on each card/side) */
  load(config: Configuration, side: 'front'|'back') {
    this.viewport = document.getElementById('fc2-scroll-area')!

    // Setup logging
    let elm = document.getElementById('log-panel')
    if (!elm && config.log) {
      elm = document.createElement('pre')
      elm.id = 'log-panel'
      elm.hidden = true
      elm = this.viewport.parentElement!.appendChild(elm)
    }
    this.log = logger(elm, config.log)

    this.cfg = config
    this.cfg.front = side === 'front'
    this.content = document.getElementById('fc2-content')!
    this.current = this.content.querySelector('.cloze')!
    // Check backend version
    if (this.current.dataset.ordinal === undefined) return

    this.search = new Searcher(this.viewport, this.log)

    this.ordinal ||= parseInt(this.current.dataset.ordinal!)
    this.expose = this.generate_expose()

    // Setup class lists
    this.content.parentElement!.classList.remove(this.cfg.front ? 'back' : 'front')
    this.content.parentElement!.classList.add(this.cfg.front ? 'front' : 'back')

    // Tag parsing and title setting is dependent on user not having removed the title
    const title = document.querySelector('#fc2-title') as HTMLElement
    if (title) {
      for (const tag of title.classList) {
        if (!tag.startsWith('fc2.cfg.')) continue
        const parts = tag.slice(8).split('.')
        const tag_side = ['front', 'back'].includes(parts[0]) ? parts.shift() : undefined
        if (tag_side && tag_side !== side || this.cfg[parts[0]]?.[parts[1]] === undefined)
          continue
        typeof(this.cfg[parts[0]][parts[1]]) === 'boolean'
          ? parts[2] === 'true'
          : parts.slice(2)
      }

      // Setup title for min version - MODEL SPECIFIC CODE
      if (!title.innerText) {
        // Use first `<h1>` as title
        const h1 = this.content.querySelector('h1')
        if (h1) {
          title.innerText = h1.innerText
          h1.remove()
        }
        // Otherwise use deck name if we can find it
        else {
          const ttxt = document.getElementById('deck')?.innerText.split('::').pop()
          if (ttxt) title.innerText = ttxt
          else title.remove()
        }
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
        .forEach(nd => (nd as HTMLElement).hidden = true)

    // Show info field per default depending on config
    if (!this.cfg.show.info) {
      const el = document.querySelector('#info.additional-content') as HTMLElement
      if (el) el.hidden = true
    }

    // Track scrolling on front, on unload would be more efficient
    if (this.cfg.front) this.viewport.onscroll = (_evt) =>
        sessionStorage.setItem('fc2_scroll_top', this.viewport.scrollTop.toString())

    // Setup document level event handlers - should not be added if already there -
    // Desktop reuses same window/FC2 instance, Droid a new window/FC2 so track when added
    // Note: bind to FC2 this instance, otherwise called with window as this
    if (!this.listeners) {
      document.addEventListener("click", this.mouse.bind(this))
      document.addEventListener("keydown", this.keyboard.bind(this))
      this.listeners = true
    }

    // Reveal finished content, remove placeholder and scroll to first active cloze
    this.content.style.display = 'block'
    document.getElementById('fc2-content-placeholder')!.remove()
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

  /** Show cloze (and save cloze hint PRN) */
  show(el: HTMLElement) {
    this.log('show', el.tagName)
    if (!el?.classList.contains('hide')) return
    el.classList.remove('hide')
    el.innerHTML = el.dataset.cloze!
    for (const child of el.querySelectorAll(':scope .cloze, :scope .cloze-inactive'))
      this.hide(child as HTMLElement)
  }

  /** Hide cloze (and save cloze content PRN) */
  hide(el: HTMLElement) {
    this.log('hide')
    if (el?.classList.contains('hide')) return
    el.classList.add('hide')
    if (!this.search.hidden) this.search.hidden = true
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
    const show = cloze.classList.contains('hide')
    if (show) this.show(cloze)
    else this.hide(cloze)
    return show
  }

  /** Toggle field visibility state */
  toggle_field(field: HTMLElement) {
    this.log('toggle_field')
    const fld = field.parentElement?.querySelector('.additional-content')! as HTMLElement
    fld.hidden = !fld.hidden
  }

  /** Toggle all clozes and fields, sync towards show or force */
  toggle_all(show: boolean|undefined = undefined) {
    this.log('toggle_all')
    if (show === true || this.search.hidden ||
      show === undefined &&
      this.content.querySelector('.cloze.hide, .cloze-inactive.hide, .additional-content[hidden]')
    ) {
      this.content.querySelectorAll('.cloze.hide, .cloze-inactive.hide')
        .forEach(el => { this.show(el as HTMLElement) })
      this.viewport.querySelectorAll('.additional-content[hidden]')
        .forEach(el => {(el as HTMLElement).hidden = false})
      this.search.hidden = false
      return true
    }
    else {
      this.content.querySelectorAll('.cloze:not(.hide), .cloze-inactive:not(.hide)')
        .forEach(el => { this.hide(el as HTMLElement) })
      this.viewport.querySelectorAll('.additional-content:not([hidden])')
        .forEach(el => {(el as HTMLElement).hidden = true})
      this.search.hidden = true
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
      this.log('    line_height')
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

  /** Handle document level mouse events */
  mouse(evt: MouseEvent) {
    this.log('mouse event')
    const target = evt.target as HTMLElement
    const classes = target.classList!

    // Cloze click handling
    if (classes.contains('cloze') || classes.contains('cloze-inactive')) {
      evt.stopPropagation() // To avoid toggling parents
      if (!document.getSelection()?.toString()) { // Avoid toggling when copying text
        if (!this.cfg.iteration.top) this.current = target
        this.toggle_cloze(target)
        this.scroll_to({ scroll: this.cfg.scroll.click, cloze: target })
      }
    }

    // Additional content (header and actual content)
    else if (classes.contains('additional-header') || classes.contains('additional-content')) {
      if (!document.getSelection()?.toString()) // Avoid toggling when copying text
        this.toggle_field(target)
    }
    // Toggle all button and bar
    else if (target.id === 'fc2-show-all-btn') this.search.hidden = !this.toggle_all()
    else if (target.id === 'nav-toggle-all') this.search.hidden = !this.toggle_all()

    // Iterate bars
    else if (target.id === 'nav-prev-cloze') this.iter(false)
    else if (target.id === 'nav-next-cloze') this.iter(true)
  }

  /** Handle document level keyboard events */
  keyboard(evt: KeyboardEvent) {
    this.log('keyboard event')
    if (evt.key === 'Escape' && !this.search.panel.hidden) {
      this.search.hidden = true
      evt.stopImmediatePropagation()
    }
    else if (evt.key === this.cfg.shortcuts.next) this.iter(true)
    else if (evt.key === this.cfg.shortcuts.previous) this.iter(false)
    else if (evt.key === this.cfg.shortcuts.toggle_all) this.toggle_all()
    else if (evt.key === 'f' && evt.ctrlKey && !evt.metaKey) {
      if (this.search.hidden) this.toggle_all(true)
      this.search.focus()
    }
    else return

    // All non-handled events returned above
    evt.stopPropagation()
    evt.preventDefault()
  }
}
