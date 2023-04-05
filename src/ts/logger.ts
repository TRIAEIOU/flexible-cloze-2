/**
 * logger(parent_selector: string, lvl:boolean|undefined|'error')
 * returns static instance of logger.
 */
interface Logger {
  (str: string, args?: any): void
  element: HTMLElement
}

// Avoid double definitions
var logger
if (!logger) { // Keep in isolated scope to avoid namespace polution
  console.log('creating logger')
  function fn(parent: string, lvl: boolean|undefined|'error') {
    // Get existing output element or create new one
    let elm = document.getElementById('log-panel')
    if (!elm) {
      elm = document.createElement('pre')
      elm.id = 'log-panel'
      elm.hidden = true
      elm = (document.querySelector(parent) || document.body).appendChild(elm)
    }

    // Return any existing instance (with updated output element)
    if (fn['self']) {
      fn['self'].element = elm
      return fn['self']
    }

    // Default log function is noop
    let log: Logger = ((_) => {}) as Logger

    // Any debug level
    if (lvl) {
      // Store element
      log.element = elm
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
    }

    // Return newly stored instance
    return fn['self'] = log

  }
  logger = fn
}