var FC2 = /** @class */ (function () {
    /** One-time runs */
    function FC2(config) {
        var _this = this;
        this.dbg = function () { };
        // Setup debug
        if (config.debug)
            this.setup_debug(config.debug);
        // Check for backend version
        if (document.querySelector('.cloze')['dataset'].ordinal === undefined)
            return;
        // Setup document level event handlers
        document.addEventListener("click", function (evt) {
            var target = evt.target;
            // Cloze click handling
            if (target.classList.contains('cloze')
                || target.classList.contains('cloze-inactive')) {
                evt.stopPropagation(); // To avoid toggling parents
                if (!_this.cfg.iteration.top)
                    _this.current = evt.target;
                _this.toggle_cloze(evt.target);
                _this.scroll_to({ scroll: _this.cfg.scroll.click, cloze: evt.target });
            } // Additional content (header and actual content)
            else if (target.classList.contains('additional-header'))
                _this.toggle_field(target.nextElementSibling);
            else if (target.classList.contains('additional-content'))
                _this.toggle_field(evt.target);
            // Toggle all button
            else if (target.id === 'fc2-show-all-btn')
                _this.toggle_all();
            // Nav bars
            else if (target.id === 'nav-toggle-all')
                _this.toggle_all();
            else if (target.id === 'nav-prev-cloze')
                _this.iter(false);
            else if (target.id === 'nav-next-cloze')
                _this.iter(true);
        });
        document.addEventListener("keydown", function (evt) {
            if (evt.key === _this.cfg.shortcuts.next) {
                _this.iter(true);
                evt.preventDefault();
            }
            else if (evt.key === _this.cfg.shortcuts.previous) {
                _this.iter(false);
                evt.preventDefault();
            }
            else if (evt.key === _this.cfg.shortcuts.toggle_all) {
                _this.toggle_all();
                evt.preventDefault();
            }
        });
    }
    /** Done on each card/side */
    FC2.prototype.load = function (config, front) {
        var _this = this;
        this.cfg = config;
        this.cfg.front = front;
        this.content = document.getElementById('fc2-content');
        this.viewport = document.getElementById('fc2-scroll-area');
        this.current = this.content.querySelector('.cloze');
        this.log = document.getElementById('fc2-log');
        this.ordinal || (this.ordinal = parseInt(this.current.dataset.ordinal));
        this.expose = this.generate_expose();
        // Setup class lists
        this.content.parentElement.classList.remove(this.cfg.front ? 'back' : 'front');
        this.content.parentElement.classList.add(this.cfg.front ? 'front' : 'back');
        // Strip expose char from active clozes and hide if front
        this.content.querySelectorAll('.cloze').forEach((function (cloze) {
            _this.expose(cloze);
            if (_this.cfg.front)
                _this.hide(cloze);
        }));
        // Expose inactive clozes from expose char or containing active cloze
        this.content.querySelectorAll('.cloze-inactive').forEach((function (cloze) {
            if (_this.expose(cloze) || cloze.querySelector('.cloze'))
                cloze.classList.remove('cloze-inactive');
            else if (!_this.cfg.show.inactive)
                _this.hide(cloze);
        }));
        // Show additional fields per default depending on config
        if (!this.cfg.show.additional)
            this.viewport.querySelectorAll(':not(#info).additional-content')
                .forEach(function (nd) { return _this.hide(nd); });
        // Show info field per default depending on config
        if (!this.cfg.show.info)
            this.hide(document.querySelector('#info.additional-content'));
        // Setup initial scroll
        var initial_pos;
        if (this.cfg.front) { // Track scrolling on front, on unload would be more efficient
            initial_pos = 0;
            this.viewport.onscroll = function (evt) {
                return sessionStorage.setItem('fc2_vp_top', _this.viewport.scrollTop.toString());
            };
        }
        else { // Retrieve scrolling on back
            initial_pos = parseFloat(sessionStorage.getItem('fc2_vp_top')) || 0;
        }
        // Reveal finished content, hide placeholder and scroll to first active cloze
        this.content.style.display = 'block';
        document.getElementById('fc2-content-placeholder').style.display = 'none';
        window.requestAnimationFrame(function () { return window.requestAnimationFrame(function () { return _this.scroll_to({ scroll: _this.cfg.scroll.initial, start_y: initial_pos }); }); });
    };
    /** Initialize debug element and setup `this.dbg()` depending on config */
    FC2.prototype.setup_debug = function (debug) {
        var _this = this;
        // Capture errors
        window.onerror = function (emsg, _src, _ln, _col, err) {
            _this.log || (_this.log = add_log_el());
            _this.log.innerText += "error ".concat(emsg, ":\n").concat(err.stack, "\n");
            _this.log.scrollTop = _this.log.scrollHeight;
            return true;
        };
        // Else noop
        if (debug === true)
            this.dbg = function (str, args) {
                this.log || (this.log = add_log_el());
                var msg = str;
                if (args && (typeof (args) === typeof (arguments) || typeof (args) === typeof ([]))) {
                    for (var i = 0; i < args.length; i++) {
                        msg += i ? ', ' : ': ';
                        if (typeof (args[i]) == 'object')
                            msg += JSON.stringify(args[i]);
                        else if (typeof (args[i]) == 'string')
                            msg += "\"".concat(args[i], "\"");
                        else
                            msg += args[i];
                    }
                }
                else if (args)
                    msg += ": ".concat(args);
                this.log.innerText += "".concat(msg, "\n");
                this.log.scrollTop = this.log.scrollHeight;
            };
        /** Append log element */
        function add_log_el() {
            var log = document.createElement('pre');
            log.id = 'fc2-log';
            document.getElementById('fc2-scroll-area').parentElement.appendChild(log);
            return log;
        }
    };
    /** Create expose function from config */
    FC2.prototype.generate_expose = function () {
        var _this = this;
        this.dbg('generate_expose', arguments);
        var expose_;
        if (this.cfg.expose.pos === 'pre') {
            expose_ = function (el) {
                var _a, _b;
                if ((_b = (_a = el.previousSibling) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.endsWith(_this.cfg.expose.char))
                    el.previousSibling.data = el.previousSibling.data.slice(0, -1);
                else
                    return false;
                return true;
            };
        }
        else if (this.cfg.expose.pos === 'post') {
            expose_ = function (el) {
                var _a, _b;
                if ((_b = (_a = el.nextSibling) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.startsWith(_this.cfg.expose.char))
                    el.nextSibling.data = el.nextSibling.data.substring(1);
                else
                    return false;
                return true;
            };
        }
        else if (this.cfg.expose.pos === 'end') {
            expose_ = function (el) {
                var _a, _b, _c;
                if ((_a = el.dataset.cloze) === null || _a === void 0 ? void 0 : _a.endsWith(_this.cfg.expose.char))
                    el.dataset.cloze = el.dataset.cloze.slice(0, -1);
                else if ((_c = (_b = el.lastChild) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.endsWith(_this.cfg.expose.char))
                    el.lastChild.data = el.lastChild.data.slice(0, -1);
                else
                    return false;
                return true;
            };
        }
        else {
            expose_ = function (el) {
                var _a, _b, _c;
                if ((_a = el.dataset.cloze) === null || _a === void 0 ? void 0 : _a.startsWith(_this.cfg.expose.char))
                    el.dataset.cloze = el.dataset.cloze.substring(1);
                else if ((_c = (_b = el.firstChild) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.startsWith(_this.cfg.expose.char))
                    el.firstChild.data = el.firstChild.data.substring(1);
                else
                    return false;
                return true;
            };
        }
        return this.cfg.expose.reverse ? function (el) { return !expose_(el); } : expose_;
    };
    /** Hide cloze/field (and save cloze content PRN) */
    FC2.prototype.hide = function (el) {
        this.dbg('hide', arguments);
        if (!el || el.classList.contains('hide'))
            return;
        el.classList.add('hide');
        // Done if additional field
        if (el.classList.contains('additional-content'))
            return;
        // Store cloze content and hint PRN
        if (el.dataset.cloze === undefined)
            el.dataset.cloze = el.innerHTML;
        // Store hint PRN and possible
        if (el.dataset.hint === undefined) {
            if (el.innerHTML === '[...]' || el.classList.contains('cloze-inactive'))
                el.dataset.hint = this.cfg.prompt;
            else
                el.dataset.hint = ""; // This should try to parse hint from content and format?
        }
        el.innerHTML = el.dataset.hint;
    };
    /** Show cloze/field (and save cloze hint PRN) */
    FC2.prototype.show = function (el) {
        this.dbg('show', arguments);
        if (!el || !el.classList.contains('hide'))
            return;
        el.classList.remove('hide');
        // Done if additional field
        if (el.classList.contains('additional-content'))
            return;
        el.innerHTML = el.dataset.cloze;
        for (var _i = 0, _a = el.querySelectorAll(':scope .cloze, :scope .cloze-inactive'); _i < _a.length; _i++) {
            var child = _a[_i];
            this.hide(child);
        }
    };
    /** Toggle cloze visibility state */
    FC2.prototype.toggle_cloze = function (cloze) {
        this.dbg('toggle_cloze', arguments);
        cloze.classList.contains('hide') ? this.show(cloze) : this.hide(cloze);
    };
    /** Toggle field visibility state */
    FC2.prototype.toggle_field = function (field) {
        this.dbg('toggle_field', arguments);
        field.classList.contains('hide')
            ? field.classList.remove('hide')
            : field.classList.add('hide');
    };
    /** Toggle all clozes and fields, sync towards show */
    FC2.prototype.toggle_all = function () {
        var _this = this;
        this.dbg('toggle_all', arguments);
        if (this.content.querySelector('.cloze.hide, .cloze-inactive.hide'))
            this.content.querySelectorAll('.cloze.hide, .cloze-inactive.hide')
                .forEach(function (el) { _this.show(el); });
        else
            this.content.querySelectorAll('.cloze:not(.hide), .cloze-inactive:not(.hide)')
                .forEach(function (el) { _this.hide(el); });
    };
    /** Iterate forward or backward, start by showing current if hidden */
    FC2.prototype.iter = function (fwd) {
        var _a;
        this.dbg('iter', arguments);
        var els = this.content.querySelectorAll('.cloze');
        var nxt;
        if ((_a = this.current) === null || _a === void 0 ? void 0 : _a.classList.contains('hide'))
            nxt = this.current;
        if (fwd && this.current === els[els.length - 1])
            nxt = this.cfg.iteration.loop ? els[0] : this.current;
        else if (!fwd && this.current === els[0])
            nxt = this.cfg.iteration.loop ? els[els.length - 1] : this.current;
        for (var i = 0; !nxt && i < els.length; i++) {
            if (els[i] === this.current)
                nxt = els[i + (fwd ? 1 : -1)];
        }
        if (nxt !== this.current && this.cfg.iteration.hide)
            this.hide(this.current);
        this.show(this.current = nxt);
        this.scroll_to({ scroll: this.cfg.scroll.iterate, cloze: this.current });
    };
    /** Scroll to active clozes or specific cloze */
    FC2.prototype.scroll_to = function (opts) {
        var _this = this;
        this.dbg('scroll_to', arguments);
        if (opts.scroll === 'none')
            return;
        window.requestAnimationFrame(function () {
            var first, last;
            if (opts.cloze)
                first = last = opts.cloze;
            else {
                var active = _this.content.querySelectorAll('.cloze');
                first = active[0];
                last = active[active.length - 1];
            }
            var offset = _this.viewport.offsetTop; // offset from closest positioned parent top
            var vp_top = opts.start_y || 0;
            var vp_height = _this.viewport.clientHeight;
            var top, bottom = (last.offsetTop - offset) + last.offsetHeight;
            var y = 0;
            // Context scroll, either from preceding or HR/HX
            if (opts.scroll === 'context') {
                // Find section
                var section = void 0;
                if (_this.content.querySelectorAll('hr, h1, h2, h3, h4, h5, h6').length) {
                    top = 0;
                    for (var _i = 0, _a = _this.content.querySelectorAll('hr, h1, h2, h3, h4, h5, h6, .cloze'); _i < _a.length; _i++) {
                        var nd = _a[_i];
                        if (nd.tagName === 'SPAN')
                            break;
                        section = nd;
                    }
                    if (section) {
                        top = section.tagName === 'HR'
                            ? section.offsetTop - offset + section.offsetHeight
                            : section.offsetTop - offset - 5;
                    }
                }
                else {
                    // No sections found, use preceding inactive
                    var all = _this.content.querySelectorAll('.cloze, .cloze-inactive');
                    for (var i = 1; i < all.length && !top; i++)
                        if (all[i] === first)
                            top = all[i - 1].offsetTop - offset + all[i - 1].offsetHeight;
                }
                y = _this.cfg.front || bottom < top + vp_height
                    ? top
                    : bottom - vp_height; // back side & doesn't fit, scroll min
            }
            else { // Not context, use one line margins
                top = first.offsetTop - offset - line_height.call(_this, window.getComputedStyle((first === null || first === void 0 ? void 0 : first.previousElementSibling) || first, ':before')) + 3;
                bottom += line_height.call(_this, window.getComputedStyle((last === null || last === void 0 ? void 0 : last.nextElementSibling)
                    || last, ':after')) + 3;
                if (opts.scroll === 'min') {
                    // above
                    if (top < vp_top)
                        y = top;
                    // below
                    else if (bottom > vp_top + vp_height)
                        y = bottom - vp_height;
                    else
                        y = vp_top; // Scroll as on back we need to restore
                } // center
                else
                    y = top + (bottom - top) / 2 - vp_height / 2;
            }
            _this.dbg('offset', offset);
            _this.dbg('vp_top', vp_top);
            _this.dbg('y', y);
            _this.viewport.scrollTo(0, y);
        });
        function line_height(style) {
            this.dbg('line_height');
            return parseInt(style.height) + parseInt(style.marginTop) + parseInt(style.marginBottom)
                || parseInt(style.lineHeight)
                || 20;
        }
    };
    return FC2;
}());
var fc2;
if (!fc2)
    fc2 = new FC2(config);
fc2.load(config, FRONT_SIDE);
