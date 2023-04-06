import type {Logger} from './logger'
/**
 * Initializes and returns search function interface, default method is search
 * Credit Julien Grégoire: https://stackoverflow.com/questions/58553501/how-to-highlight-search-text-from-string-of-html-content-without-breaking
 */
export class Searcher {
  scroll!: HTMLElement
  content!: HTMLElement
  panel!: HTMLElement
  field!: HTMLInputElement
  button!: HTMLElement
  sstr!: string
  matches!: HTMLElement[]
  index!: number
  log!: Logger

  constructor(scroll: HTMLElement, content: HTMLElement, logger: Logger = ((() => {}) as any)) {
    logger('searcher.constructor()')
    this.scroll = scroll
    this.content = content
    this.log = logger
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
        this.matches[this.index].classList.replace('search-match', 'search-matches')
      this.index = this.index < this.matches.length - 1
        ? this.index + 1
        : 0
      this.matches[this.index].classList.replace('search-matches', 'search-match')
      this.matches[this.index].scrollIntoView(
        {behavior: 'auto', block: 'center', inline: 'nearest'}
      )
    }
  }

  highlight(re: RegExp) {
    this.log('searcher.highlight')
    const txt = this.content.textContent!
    const rct = this.scroll.getBoundingClientRect()
    const stl = getComputedStyle(this.content)
    const offset = {
      top: this.scroll.scrollTop - rct.top - parseFloat(stl.marginTop),
      left: this.scroll.scrollLeft - rct.left - parseFloat(stl.marginLeft)
    }
    let match, sstr = this.field.value
    const sel = window.getSelection()!
    sel.removeAllRanges()
    // to handle multiple result you need to go through all matches
    while (match = re.exec(txt)) {
      const itr = nd_itr(this.content)
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
            this.content.appendChild(light)
            light.classList.add('search-matches')
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

  show() {
    this.log('searcher.show')
    this.panel.hidden = false
    this.field.select()
    this.field.focus()
  }

  hide() {
    this.log('searcher.hide')
    this.clear()
    this.panel.hidden = true
  }
}