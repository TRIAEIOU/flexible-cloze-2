export interface Logger {
  (str: string, args?: any): void
  element: HTMLElement
}

/** Create logging function */
export function logger(element: HTMLElement|null, lvl: boolean|undefined|'error'): Logger {
  // Default log function is noop
  let log: Logger = ((_) => {}) as Logger

  // Any debug level
  if (lvl && element) {
    // If full debug replace default noop with actual output
    if (lvl === true) {
      log = ((str: string, args: any) => {
        if (log.element.hidden) log.element.hidden = false
        let msg = str
        if (typeof(args) === 'object') {
          for (let i = 0; i < args.length; i++) {
            msg += i ? ', ' : ': '
            if (typeof (args[i]) == 'object') msg += JSON.stringify(args[i])
            else if (typeof (args[i]) == 'string') msg += `"${args[i]}"`
            else msg += args[i]
          }
        } else if (args) msg += `: ${args}`
        log.element.innerText += `${msg}\n`
        log.element.scrollTop = log.element.scrollHeight
      }) as Logger
    }

    // Capture errors at all log levels
    window.onerror = (emsg, _src, _ln, _col, err) => {
      if (log.element.hidden) log.element.hidden = false
      log.element.innerText += `error ${emsg}:\n${err!.stack}\n`
      log.element.scrollTop = log.element.scrollHeight
      return true
    }

    // Store and initialize provided element
    log.element = element
    log.element.id = 'log-panel'
    log.element.hidden = true
  }

  // Return newly stored instance
  return log
}
