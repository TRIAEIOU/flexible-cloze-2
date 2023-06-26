import {logger} from './logger'
import type { Logger } from './logger'
import {Searcher} from './searcher'
import type { Configuration } from './configuration'
import { ancestor } from './utils'

export class FC2 {
  cfg!: Configuration
  log!: Logger
  search!: Searcher
  content!: HTMLElement
  viewport!: HTMLElement
  current!: HTMLElement
  ordinal!: number
  listeners = false

  /** Load/parse (done on each card/side) */
  load(config: Configuration, side: 'front'|'back') {
    this.viewport = document.getElementById('fc2-viewport')!

    // Setup logging
    let elm = document.getElementById('fc2-log-panel')
    if (!elm && config.fields?.log) {
      elm = document.createElement('pre')
      elm.id = 'fc2-log-panel'
      elm.hidden = true
      elm = this.viewport.parentElement!.appendChild(elm)
    }
    this.log = logger(elm, config.fields?.log)

    this.cfg = config
    this.cfg.front = side === 'front'
    this.content = document.getElementById('fc2-content')!
    this.current = this.content.querySelector('.cloze')!
    // Check backend version
    if (this.current.dataset.ordinal === undefined) return
    this.search = new Searcher(this.viewport, 'fc2-', this.log)
    this.ordinal ||= parseInt(this.current.dataset.ordinal!)

    // Setup class lists
    this.content.parentElement!.classList.remove(this.cfg.front ? 'back' : 'front')
    this.content.parentElement!.classList.add(this.cfg.front ? 'front' : 'back')

    // Setup configuration tag overrides
    const tags = document.getElementById('fc2-meta-tags')!.innerText.split(' ')
    for (const tag of tags) {
      if (!tag.startsWith('fc2.')) continue
      const parts = tag.slice(4).split('.')
      const tag_side = ['front', 'back'].includes(parts[0]) ? parts.shift() : undefined
      if (tag_side && tag_side !== side || this.cfg[parts[0]]?.[parts[1]] === undefined)
        continue
      this.cfg[parts[0]][parts[1]] = typeof(this.cfg[parts[0]][parts[1]]) === 'boolean'
        ? parts[2] === 'true'
        : parts.slice(2)
    }

    // Setup title
    let title = document.getElementById('fc2-title')
    // Setup title for min version - MODEL SPECIFIC CODE
    if (!title && this.cfg.fields?.title) {
      let titles
      // Use first `<h1>` as title
      const h1 = this.content.querySelector('h1')
      if (h1) {
        titles = h1.innerText
        h1.remove()
      }
      // Otherwise use deck name if we can find it
      else titles = document.getElementById('fc2-meta-subdeck')?.innerText
      if (titles) {
        title = document.createElement('div')
        title.id = 'fc2-title'
        title.innerText = titles
        this.viewport.insertAdjacentElement('beforebegin', title)
      }
    }

    // Prepare clozes: strip cloze when exposed
    // Active clozes: store hint and hide as required
    // Inactive clozes: expose if containing active cloze
    const expose = this.generate_expose() // Generate after tag overrides
    let active_seen = false
    this.content.querySelectorAll('.cloze-inactive, .cloze').forEach(((cloze: HTMLElement) => {
      const active = cloze.classList.contains('cloze')
      active_seen ||= active
      const exposed = expose(cloze)
      if (!active && (exposed || cloze.querySelector('.cloze'))) {
        cloze.classList.remove('cloze-inactive')
        return
      }

      cloze.dataset.hint = this.cfg.front && active && cloze.innerHTML !== '[...]'
        ? this.cfg.hint.replace('%h', cloze.innerHTML.slice(1, cloze.innerHTML.length - 1)) || ""
        : this.cfg.prompt

      if (
        active && this.cfg.front ||
        !active && (
          !this.cfg.show.inactive ||
          this.cfg.show.inactive === 'preceding' && active_seen
        )
      )
        this.hide(cloze)
    }) as any)

    // Show additional fields per default depending on config
    if (!this.cfg.show.additional)
      this.viewport.querySelectorAll('.fc2-additional-content')
        .forEach(nd => (nd as HTMLElement).hidden = true)

    // Setup footers
    if (this.cfg.fields?.legends?.length) {
      const footer = document.createElement('div')
      footer.id = 'fc2-footer'
      this.viewport.insertAdjacentElement('afterend', footer)

      for (const legend of this.cfg.fields.legends) {
          const row = document.createElement('div')
          row.className = 'fc2-legends'
          footer.appendChild(row)
          for (const itm of legend) {
            let cell = document.createElement('div') as HTMLElement
            cell.innerHTML = itm
            cell = cell.firstElementChild as HTMLElement
            if (!cell) continue
            cell.className = 'fc2-legend'
            row.appendChild(cell)
          }
      }
    }

    // "Show all" button
    if (this.cfg.fields?.show_all_button) {
      const btn = document.createElement('button')
      btn.id = "fc2-show-all-btn"
      btn.innerText = "Show all"
      this.viewport.insertAdjacentElement('afterend', btn)
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

  /** Create expose function from config, return true if exposed, else false */
  generate_expose() {
  this.log('generate_expose')
    let expose_
    if (this.cfg.expose.pos === 'pre') {
      expose_ = (el) => {
        if (el.previousSibling?.data?.endsWith(this.cfg.expose.char)) {
          el.previousSibling.data = el.previousSibling.data.slice(0, -1)
          return true
        }
        return false
      }
    } else if (this.cfg.expose.pos === 'post') {
      expose_ = (el) => {
        if (el.nextSibling?.data?.startsWith(this.cfg.expose.char)) {
          el.nextSibling.data = el.nextSibling.data.substring(1)
          return true
        }
        return false
      }
    } else if (this.cfg.expose.pos === 'end') {
      expose_ = (el) => {
        if (el.dataset.cloze?.endsWith(this.cfg.expose.char)) {
          el.dataset.cloze = el.dataset.cloze.slice(0, -1)
          return true
        }          
        else if (el.lastChild?.data?.endsWith(this.cfg.expose.char)) {
          el.lastChild.data = el.lastChild.data.slice(0, -1)
          return true
        }
        return false
      }
    } else {
      expose_ = (el) => { // begin
        if (el.dataset.cloze?.startsWith(this.cfg.expose.char)){
          el.dataset.cloze = el.dataset.cloze.substring(1)
          return true
        }
        else if (el.firstChild?.data?.startsWith(this.cfg.expose.char)) {
          el.firstChild.data = el.firstChild.data.substring(1)
          return true
        }
        return false
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
    for (const child of el.querySelectorAll(':scope .cloze, :scope .cloze-inactive') as NodeListOf<HTMLElement>) {
      // Potentially first parse of nested inactive, hint has never been available
      if (child.dataset.hint === undefined) child.dataset.hint = ''
      this.hide(child)
    }
  }

  /** Hide cloze (and save cloze content PRN) 
   * Also, in case of nested inactive clozes: they were not parsed initially (as they were
   * in dataset.cloze) and therefore needs setting hint to `''`
   */
  hide(el: HTMLElement) {
    this.log('hide')
    if (el?.classList.contains('hide')) return
    el.classList.add('hide')
    if (!this.search.hidden) this.search.hidden = true
    // Store cloze content PRN
    if (el.dataset.cloze === undefined) el.dataset.cloze = el.innerHTML
    el.innerHTML = el.dataset.hint!
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
    const fld = ancestor(field, '.fc2-additional-content') ||
      ancestor(field, '.fc2-additional-header')!.nextElementSibling! as HTMLElement
    if (fld) fld.hidden = !fld.hidden
  }

  /** Toggle all clozes and fields, sync towards show or force */
  toggle_all(show: boolean|undefined = undefined) {
    this.log('toggle_all')
    if (show === true || this.search.hidden ||
      show === undefined &&
      this.content.querySelector('.cloze.hide, .cloze-inactive.hide, .fc2-additional-content[hidden]')
    ) {
      this.content.querySelectorAll('.cloze.hide, .cloze-inactive.hide')
        .forEach(el => { this.show(el as HTMLElement) })
      this.viewport.querySelectorAll('.fc2-additional-content[hidden]')
        .forEach(el => {(el as HTMLElement).hidden = false})
      this.search.hidden = false
      return true
    }
    else {
      this.content.querySelectorAll('.cloze:not(.hide), .cloze-inactive:not(.hide)')
        .forEach(el => { this.hide(el as HTMLElement) })
      this.viewport.querySelectorAll('.fc2-additional-content:not([hidden])')
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
    const el = evt.target as HTMLElement
    let target

    // Cloze click handling
    if (target = ancestor(el, '.cloze, .cloze-inactive')) {
      evt.stopPropagation() // To avoid toggling parents
      if (!document.getSelection()?.toString()) { // Avoid toggling when copying text
        if (!this.cfg.iteration.top) this.current = target
        this.toggle_cloze(target)
        this.scroll_to({ scroll: this.cfg.scroll.click, cloze: target })
      }
    }

    // Additional content (header and actual content)
    else if (target = ancestor(el, '.fc2-additional-header, .fc2-additional-content')) {
      if (!document.getSelection()?.toString()) // Avoid toggling when copying text
        this.toggle_field(target)
    }
    // Toggle all button and bar
    else if (['fc2-show-all-btn', 'fc2-nav-toggle-all'].includes(el.id))
      this.search.hidden = !this.toggle_all()

    // Iterate bars
    else if (el.id === 'fc2-nav-prev-cloze') this.iter(false)
    else if (el.id === 'fc2-nav-next-cloze') this.iter(true)
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
