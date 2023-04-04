export interface Logger {
  (str: string, args?: any): void
  element?: HTMLElement|null
}
export var logger
logger ||= (parent: HTMLElement, lvl: boolean|undefined|'error') => {
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