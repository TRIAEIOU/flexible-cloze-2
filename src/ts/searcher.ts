/// <reference path="./logger.ts" />
/**
 * Initializes and returns search function interface, default method is search
 * Credit Julien Grégoire: https://stackoverflow.com/questions/58553501/how-to-highlight-search-text-from-string-of-html-content-without-breaking
 */
interface Searcher {
  search(): void
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


var Searcher
if (!Searcher) {
  Searcher = class {
    scroll!: HTMLElement
    content!: HTMLElement
    panel!: HTMLElement
    field!: HTMLInputElement
    button!: HTMLElement
    sstr!: string
    matches!: HTMLElement[]
    index!: number

    constructor(scroll: HTMLElement, content: HTMLElement) {
      const log = logger(scroll.parentElement!, 'error')
    // Setup search function (default method)
    const fn = (() => {
      log('searcher()')
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
        log('searcher.highlight')
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
      log('searcher.clear')
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
      log('searcher.show')
      fn.panel.hidden = false
      fn.field.select()
      fn.field.focus()
    }

    /** Hide search panel */
    fn.hide = () => {
      log('searcher.hide')
      fn.clear()
      fn.panel.hidden = true
    }

    return fn
  }
}
}