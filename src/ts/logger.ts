export interface Logger {
  (str: string, args?: any): void
  element: HTMLElement
}

/** Create logging function */
export function logger(element: HTMLElement, lvl: boolean|undefined|'error'): Logger {
  // Initialize provided element
  element.id = 'log-panel'
  element.hidden = true

  // Default log function is noop
  let log: Logger = ((_) => {}) as Logger

  // Any debug level
  if (lvl) {
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

    // Store element
    log.element = element
  }

  // Return newly stored instance
  return log
}
