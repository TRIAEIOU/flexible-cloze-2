import type {Logger} from './logger'
/**
 * Initializes and returns search function interface, default method is search
 * Credit Julien Grégoire: https://stackoverflow.com/questions/58553501/how-to-highlight-search-text-from-string-of-html-content-without-breaking
 */
export class Searcher {
  element!: HTMLElement
  panel!: HTMLElement
  field!: HTMLInputElement
  button!: HTMLElement
  class_: {match: string, matches: string}
  sstr!: string
  matches!: HTMLElement[]
  index!: number
  log!: Logger

  constructor(element: HTMLElement, prefix: string, logger: Logger = ((() => {}) as any)) {
    logger('searcher.constructor()')
    this.element = element, this.log = logger
    this.matches = [], this.index = -1, this.sstr = ''
    this.class_ = {
      match: prefix + 'search-match',
      matches: prefix + 'search-matches'
    }

    // Setup panel
    const panel = document.createElement('div')
    panel.id = `${prefix}search-panel`
    panel.hidden = true
    panel.innerHTML = `<input type="text" id="${prefix}search-field" placeholder="Search for text"/><div id="${prefix}search-btn" tabindex="0">Search</div>`
    this.panel = element.parentElement!.insertBefore(panel, this.element.nextElementSibling)
    this.field = document.getElementById(`${prefix}search-field`) as HTMLInputElement
    this.field.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter') {
        this.search()
        // For some reason keyboard input is lost on Desktop so we need to reset it
        this.button.focus() // On mobile we want to hide keyboard and use button
        if (!document.documentElement.classList.contains('mobile')) this.field.focus()
      } else if (evt.key === 'Escape') return
      evt.stopPropagation()
    })
    this.button = document.getElementById(`${prefix}search-btn`) as HTMLDivElement
    this.button.onclick = (evt) => {this.search()} // "bind" to Searcher instance
    this.field.onfocus = (evt) => {this.field.select()} // "bind" to Searcher instance

  }

  search() {
    this.log('searcher.search')
    // Nothing in search field - clear
    if (!this.field?.value) {
      this.clear()
      return
    }

    // Changed search string, clear old and create new searh
    if (this.field.value !== this.sstr) {
      this.clear()
      this.sstr = this.field.value
      this.highlight(RegExp(this.sstr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'gi'))
    }

    // If we have matches, clear previous highlight, highlight next and scroll
    if (this.matches?.length) {
      if (this.index >= 0)
        this.matches[this.index].classList.replace(this.class_.match, this.class_.matches)
      this.index = this.index < this.matches.length - 1
        ? this.index + 1
        : 0
      this.matches[this.index].classList.replace(this.class_.matches, this.class_.match)
      this.matches[this.index].scrollIntoView(
        {behavior: 'auto', block: 'center', inline: 'nearest'}
      )
    }
  }

  highlight(re: RegExp) {
    this.log('searcher.highlight')
    const txt = this.element.textContent!
    const rct = this.element.getBoundingClientRect()
    const stl = getComputedStyle(this.element)

    const offset = {
      top: this.element.scrollTop - rct.top - parseFloat(stl.marginTop),
      left: this.element.scrollLeft - rct.left - parseFloat(stl.marginLeft)
    }
    const sel = window.getSelection()!
    sel.removeAllRanges()
    let match, sstr = this.field.value
    // to handle multiple result you need to go through all matches
    while (match = re.exec(txt)) {
      const itr = nd_itr(this.element)
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
          match.index + sstr.length <= index + res.value.length &&
          rng
        ) {
          // when we find the end node, we can set the range end
          rng.setEnd(res.value, match.index + sstr.length - index)
          sel.addRange(rng)
          // this is where we add the divs based on the client rects of the range
          for (const rect of rng.getClientRects()) {
            const light = document.createElement('DIV')
            // light.innerText = rng.toString()
            this.element.appendChild(light)
            light.classList.add(this.class_.matches)
            light.style.top = rect.y + offset.top + 'px'
            light.style.left = rect.x  + offset.left + 'px'
            light.style.height = rect.height + 'px'
            light.style.width = rect.width + 'px'
            this.matches.push(light)
          }
        }
        index += res.value.length
        res = itr.next()
      }
    }
    sel.removeAllRanges()

    /** Iterate all descendents */
    function* nd_itr(nd: Node) {
      for (const cnd of nd.childNodes) {
        if (cnd.nodeType === Node.TEXT_NODE) yield cnd
        else yield* nd_itr(cnd)
      }
    }
  }

  clear() {
    this.log('searcher.clear')
    for (const el of this.matches) el.remove()
    this.index = -1, this.sstr = '', this.matches = []
  }

  focus() {
    this.log('searcher.focus')
    this.hidden = false
    this.field.focus()
  }

  get hidden() {return this.panel.hidden}
  set hidden(hide: boolean) {if (this.panel.hidden = hide) this.clear()}
}