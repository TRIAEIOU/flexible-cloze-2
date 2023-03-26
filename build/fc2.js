"use strict";
var FC2;
FC2 ||= class {
    constructor(config) {
        this.dbg = () => { };
        if (config.debug)
            this.setup_debug(config.debug);
        if (document.querySelector('.cloze')['dataset'].ordinal === undefined)
            return;
        document.addEventListener("click", (evt) => {
            const target = evt.target;
            if (target.classList.contains('cloze')
                || target.classList.contains('cloze-inactive')) {
                evt.stopPropagation();
                if (!this.cfg.iteration.top)
                    this.current = evt.target;
                this.toggle_cloze(evt.target);
                this.scroll_to({ scroll: this.cfg.scroll.click, cloze: evt.target });
            }
            else if (target.classList.contains('additional-header'))
                this.toggle_field(target.nextElementSibling);
            else if (target.classList.contains('additional-content'))
                this.toggle_field(evt.target);
            else if (target.id === 'fc2-show-all-btn')
                this.toggle_all();
            else if (target.id === 'nav-toggle-all')
                this.toggle_all();
            else if (target.id === 'nav-prev-cloze')
                this.iter(false);
            else if (target.id === 'nav-next-cloze')
                this.iter(true);
        });
        document.addEventListener("keydown", (evt) => {
            if (evt.key === this.cfg.shortcuts.next) {
                this.iter(true);
                evt.preventDefault();
            }
            else if (evt.key === this.cfg.shortcuts.previous) {
                this.iter(false);
                evt.preventDefault();
            }
            else if (evt.key === this.cfg.shortcuts.toggle_all) {
                this.toggle_all();
                evt.preventDefault();
            }
        });
    }
    load(config, side) {
        this.cfg = config;
        this.cfg.front = side === 'front';
        this.content = document.getElementById('fc2-content');
        this.viewport = document.getElementById('fc2-scroll-area');
        this.current = this.content.querySelector('.cloze');
        this.log = document.getElementById('fc2-log');
        this.ordinal ||= parseInt(this.current.dataset.ordinal);
        this.expose = this.generate_expose();
        this.content.parentElement.classList.remove(this.cfg.front ? 'back' : 'front');
        this.content.parentElement.classList.add(this.cfg.front ? 'front' : 'back');
        this.content.querySelectorAll('.cloze').forEach(((cloze) => {
            this.expose(cloze);
            if (this.cfg.front)
                this.hide(cloze);
        }));
        this.content.querySelectorAll('.cloze-inactive').forEach(((cloze) => {
            if (this.expose(cloze) || cloze.querySelector('.cloze'))
                cloze.classList.remove('cloze-inactive');
            else if (!this.cfg.show.inactive)
                this.hide(cloze);
        }));
        if (!this.cfg.show.additional)
            this.viewport.querySelectorAll(':not(#info).additional-content')
                .forEach(nd => this.hide(nd));
        if (!this.cfg.show.info)
            this.hide(document.querySelector('#info.additional-content'));
        if (this.cfg.front)
            this.viewport.onscroll = (_evt) => sessionStorage.setItem('fc2_scroll_top', this.viewport.scrollTop.toString());
        this.content.style.display = 'block';
        document.getElementById('fc2-content-placeholder').style.display = 'none';
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.requestAnimationFrame(() => this.scroll_to({ scroll: this.cfg.scroll.initial }))));
    }
    setup_debug(debug) {
        window.onerror = (emsg, _src, _ln, _col, err) => {
            this.log ||= add_log_el();
            this.log.innerText += `error ${emsg}:\n${err.stack}\n`;
            this.log.scrollTop = this.log.scrollHeight;
            return true;
        };
        if (debug === true)
            this.dbg = function (str, args) {
                this.log ||= add_log_el();
                let msg = str;
                if (args && (typeof (args) === typeof (arguments) || typeof (args) === typeof ([]))) {
                    for (let i = 0; i < args.length; i++) {
                        msg += i ? ', ' : ': ';
                        if (typeof (args[i]) == 'object')
                            msg += JSON.stringify(args[i]);
                        else if (typeof (args[i]) == 'string')
                            msg += `"${args[i]}"`;
                        else
                            msg += args[i];
                    }
                }
                else if (args)
                    msg += `: ${args}`;
                this.log.innerText += `${msg}\n`;
                this.log.scrollTop = this.log.scrollHeight;
            };
        function add_log_el() {
            const log = document.createElement('pre');
            log.id = 'fc2-log';
            document.getElementById('fc2-scroll-area').parentElement.appendChild(log);
            return log;
        }
    }
    generate_expose() {
        this.dbg('generate_expose', arguments);
        let expose_;
        if (this.cfg.expose.pos === 'pre') {
            expose_ = (el) => {
                if (el.previousSibling?.data?.endsWith(this.cfg.expose.char))
                    el.previousSibling.data = el.previousSibling.data.slice(0, -1);
                else
                    return false;
                return true;
            };
        }
        else if (this.cfg.expose.pos === 'post') {
            expose_ = (el) => {
                if (el.nextSibling?.data?.startsWith(this.cfg.expose.char))
                    el.nextSibling.data = el.nextSibling.data.substring(1);
                else
                    return false;
                return true;
            };
        }
        else if (this.cfg.expose.pos === 'end') {
            expose_ = (el) => {
                if (el.dataset.cloze?.endsWith(this.cfg.expose.char))
                    el.dataset.cloze = el.dataset.cloze.slice(0, -1);
                else if (el.lastChild?.data?.endsWith(this.cfg.expose.char))
                    el.lastChild.data = el.lastChild.data.slice(0, -1);
                else
                    return false;
                return true;
            };
        }
        else {
            expose_ = (el) => {
                if (el.dataset.cloze?.startsWith(this.cfg.expose.char))
                    el.dataset.cloze = el.dataset.cloze.substring(1);
                else if (el.firstChild?.data?.startsWith(this.cfg.expose.char))
                    el.firstChild.data = el.firstChild.data.substring(1);
                else
                    return false;
                return true;
            };
        }
        return this.cfg.expose.reverse ? (el) => { return !expose_(el); } : expose_;
    }
    hide(el) {
        this.dbg('hide', arguments);
        if (!el || el.classList.contains('hide'))
            return;
        el.classList.add('hide');
        if (el.classList.contains('additional-content'))
            return;
        if (el.dataset.cloze === undefined)
            el.dataset.cloze = el.innerHTML;
        if (el.dataset.hint === undefined) {
            if (el.innerHTML === '[...]' || el.classList.contains('cloze-inactive'))
                el.dataset.hint = this.cfg.prompt;
            else
                el.dataset.hint = "";
        }
        el.innerHTML = el.dataset.hint;
    }
    show(el) {
        this.dbg('show', arguments);
        if (!el || !el.classList.contains('hide'))
            return;
        el.classList.remove('hide');
        if (el.classList.contains('additional-content'))
            return;
        el.innerHTML = el.dataset.cloze;
        for (const child of el.querySelectorAll(':scope .cloze, :scope .cloze-inactive'))
            this.hide(child);
    }
    toggle_cloze(cloze) {
        this.dbg('toggle_cloze', arguments);
        cloze.classList.contains('hide') ? this.show(cloze) : this.hide(cloze);
    }
    toggle_field(field) {
        this.dbg('toggle_field', arguments);
        field.classList.contains('hide')
            ? field.classList.remove('hide')
            : field.classList.add('hide');
    }
    toggle_all() {
        this.dbg('toggle_all', arguments);
        if (this.content.querySelector('.cloze.hide, .cloze-inactive.hide'))
            this.content.querySelectorAll('.cloze.hide, .cloze-inactive.hide')
                .forEach(el => { this.show(el); });
        else
            this.content.querySelectorAll('.cloze:not(.hide), .cloze-inactive:not(.hide)')
                .forEach(el => { this.hide(el); });
    }
    iter(fwd) {
        this.dbg('iter', arguments);
        const els = this.content.querySelectorAll('.cloze');
        let nxt;
        if (this.current?.classList.contains('hide'))
            nxt = this.current;
        if (fwd && this.current === els[els.length - 1])
            nxt = this.cfg.iteration.loop ? els[0] : this.current;
        else if (!fwd && this.current === els[0])
            nxt = this.cfg.iteration.loop ? els[els.length - 1] : this.current;
        for (let i = 0; !nxt && i < els.length; i++) {
            if (els[i] === this.current)
                nxt = els[i + (fwd ? 1 : -1)];
        }
        if (nxt !== this.current && this.cfg.iteration.hide)
            this.hide(this.current);
        this.show(this.current = nxt);
        this.scroll_to({ scroll: this.cfg.scroll.iterate, cloze: this.current });
    }
    scroll_to(opts) {
        this.dbg('scroll_to', arguments);
        if (!this.cfg.front) {
            const scroll_top = parseFloat(sessionStorage.getItem('fc2_scroll_top'));
            if (!isNaN(scroll_top)) {
                sessionStorage.removeItem('fc2_scroll_top');
                this.viewport.scrollTop = scroll_top;
            }
        }
        if (opts.scroll === 'none')
            return;
        let first, last;
        if (opts.cloze)
            first = last = opts.cloze;
        else {
            const active = this.content.querySelectorAll('.cloze');
            first = active[0];
            last = active[active.length - 1];
        }
        const offset = this.viewport.getBoundingClientRect().top;
        const line_height = (style) => {
            this.dbg('line_height');
            return parseInt(style.height) + parseInt(style.marginTop) + parseInt(style.marginBottom)
                || parseInt(style.lineHeight)
                || 20;
        };
        const vp_height = this.viewport.clientHeight;
        const top = (first.getBoundingClientRect().top - offset) - line_height(window.getComputedStyle(first?.previousElementSibling || first, ':before')) + 3;
        const bottom = (last.getBoundingClientRect().bottom - offset) + line_height(window.getComputedStyle(last?.nextElementSibling || last, ':after')) + 3;
        let y = 0;
        if (opts.scroll?.slice(0, 7) === 'context') {
            let section_top = 0, section, section_seen, cloze_seen;
            const sections = this.content.querySelectorAll('hr, h1, h2, h3, h4, h5, h6, .cloze');
            for (let i = 0; i < sections.length; i++) {
                cloze_seen ||= sections[i].tagName === 'SPAN';
                section_seen ||= sections[i].tagName !== 'SPAN';
                if (!cloze_seen)
                    section = sections[i];
                if (cloze_seen && (section || section_seen))
                    break;
            }
            if (section) {
                section_top = section.tagName === 'HR'
                    ? (section.getBoundingClientRect().bottom - offset)
                    : (section.getBoundingClientRect().top - offset) - 5;
            }
            else if (!section_seen) {
                const all = this.content.querySelectorAll('.cloze, .cloze-inactive');
                for (let i = 1; i < all.length; i++) {
                    if (all[i] === this.current) {
                        section_top = (all[i - 1].getBoundingClientRect().top - offset) - 5;
                        break;
                    }
                }
            }
            if (opts.scroll === 'context-center' && bottom - section_top <= vp_height)
                y = section_top + (bottom - section_top) / 2 - vp_height / 2;
            else
                y = section_top;
        }
        else {
            if (opts.scroll === 'center') {
                if (bottom - top <= vp_height)
                    y = top + (bottom - top) / 2 - vp_height / 2;
                else
                    y = top;
            }
            else {
                this.dbg('   top', top);
                this.dbg('   bottom', bottom);
                if (top < 0)
                    y = top;
                else if (bottom > vp_height)
                    y = bottom - vp_height;
            }
        }
        this.dbg(`    scrolling ${opts.scroll} to`, this.viewport.scrollTop + y);
        if (y)
            this.viewport.scrollTop += y;
    }
};
var fc2;
fc2 ||= new FC2(config);
fc2.load(config, __TEMPLATE_SIDE__);
