var fc2
(function () {
    'use strict';

    function logger(element, lvl) {
        let log = ((_) => { });
        if (lvl && element) {
            if (lvl === true) {
                log = ((str, args) => {
                    if (log.element.hidden)
                        log.element.hidden = false;
                    let msg = str;
                    if (typeof (args) === 'object') {
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
                    log.element.innerText += `${msg}\n`;
                    log.element.scrollTop = log.element.scrollHeight;
                });
            }
            window.onerror = (emsg, _src, _ln, _col, err) => {
                if (log.element.hidden)
                    log.element.hidden = false;
                log.element.innerText += `error ${emsg}:\n${err.stack}\n`;
                log.element.scrollTop = log.element.scrollHeight;
                return true;
            };
            log.element = element;
            log.element.id = 'log-panel';
            log.element.hidden = true;
        }
        return log;
    }

    class Searcher {
        constructor(element, logger = (() => { })) {
            logger('searcher.constructor()');
            this.element = element, this.log = logger;
            this.matches = [], this.index = -1, this.sstr = '';
            const panel = document.createElement('div');
            panel.id = 'search-panel';
            panel.hidden = true;
            panel.innerHTML = '<input type="text" id="search-field" placeholder="Search for text"/><div id="search-btn" tabindex="0">Search</div>';
            this.panel = element.parentElement.insertBefore(panel, this.element.nextElementSibling);
            this.field = document.getElementById('search-field');
            this.field.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter') {
                    this.search();
                    this.button.focus();
                    if (!document.documentElement.classList.contains('mobile'))
                        this.field.focus();
                }
                else if (evt.key === 'Escape')
                    return;
                evt.stopPropagation();
            });
            this.button = document.getElementById('search-btn');
            this.button.onclick = (evt) => { this.search(); };
            this.field.onfocus = (evt) => { this.field.select(); };
        }
        search() {
            this.log('searcher.search');
            if (!this.field?.value) {
                this.clear();
                return;
            }
            if (this.field.value !== this.sstr) {
                this.clear();
                this.sstr = this.field.value;
                this.highlight(RegExp(this.sstr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'gi'));
            }
            if (this.matches?.length) {
                if (this.index >= 0)
                    this.matches[this.index].classList.replace('search-match', 'search-matches');
                this.index = this.index < this.matches.length - 1
                    ? this.index + 1
                    : 0;
                this.matches[this.index].classList.replace('search-matches', 'search-match');
                this.matches[this.index].scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
            }
        }
        highlight(re) {
            this.log('searcher.highlight');
            const txt = this.element.textContent;
            const rct = this.element.getBoundingClientRect();
            const stl = getComputedStyle(this.element);
            const offset = {
                top: this.element.scrollTop - rct.top - parseFloat(stl.marginTop),
                left: this.element.scrollLeft - rct.left - parseFloat(stl.marginLeft)
            };
            const sel = window.getSelection();
            sel.removeAllRanges();
            let match, sstr = this.field.value;
            while (match = re.exec(txt)) {
                const itr = nd_itr(this.element);
                let index = 0;
                let res = itr.next();
                while (!res.done) {
                    let rng;
                    if (match.index >= index && match.index < index + res.value.length) {
                        rng = new Range();
                        rng.setStart(res.value, match.index - index);
                    }
                    if (match.index + sstr.length >= index &&
                        match.index + sstr.length < index + res.value.length &&
                        rng) {
                        rng.setEnd(res.value, match.index + sstr.length - index);
                        sel.addRange(rng);
                        for (const rect of rng.getClientRects()) {
                            const light = document.createElement('DIV');
                            light.innerText = rng.toString();
                            this.element.appendChild(light);
                            light.classList.add('search-matches');
                            light.style.top = rect.y + offset.top + 'px';
                            light.style.left = rect.x + offset.left + 'px';
                            light.style.height = rect.height + 'px';
                            light.style.width = rect.width + 'px';
                            this.matches.push(light);
                        }
                    }
                    index += res.value.length;
                    res = itr.next();
                }
            }
            sel.removeAllRanges();
            function* nd_itr(nd) {
                for (const cnd of nd.childNodes) {
                    if (cnd.nodeType === Node.TEXT_NODE)
                        yield cnd;
                    else
                        yield* nd_itr(cnd);
                }
            }
        }
        clear() {
            this.log('searcher.clear');
            for (const el of this.matches)
                el.remove();
            this.index = -1, this.sstr = '', this.matches = [];
        }
        focus() {
            this.log('searcher.focus');
            this.hidden = false;
            this.field.focus();
        }
        get hidden() { return this.panel.hidden; }
        set hidden(hide) { if (this.panel.hidden = hide)
            this.clear(); }
    }

    class FC2 {
        constructor() {
            this.listeners = false;
        }
        load(config, side) {
            this.viewport = document.getElementById('fc2-scroll-area');
            let elm = document.getElementById('log-panel');
            if (!elm && config.log) {
                elm = document.createElement('pre');
                elm.id = 'log-panel';
                elm.hidden = true;
                elm = this.viewport.parentElement.appendChild(elm);
            }
            this.log = logger(elm, config.log);
            this.cfg = config;
            this.cfg.front = side === 'front';
            this.content = document.getElementById('fc2-content');
            this.current = this.content.querySelector('.cloze');
            if (this.current.dataset.ordinal === undefined)
                return;
            this.search = new Searcher(this.viewport, this.log);
            this.ordinal || (this.ordinal = parseInt(this.current.dataset.ordinal));
            this.expose = this.generate_expose();
            this.content.parentElement.classList.remove(this.cfg.front ? 'back' : 'front');
            this.content.parentElement.classList.add(this.cfg.front ? 'front' : 'back');
            const title = document.querySelector('#fc2-title');
            if (title) {
                for (const tag of title.classList) {
                    if (!tag.startsWith('fc2.cfg.'))
                        continue;
                    const parts = tag.slice(8).split('.');
                    const tag_side = ['front', 'back'].includes(parts[0]) ? parts.shift() : undefined;
                    if (tag_side && tag_side !== side || this.cfg[parts[0]]?.[parts[1]] === undefined)
                        continue;
                    typeof (this.cfg[parts[0]][parts[1]]) === 'boolean'
                        ? parts[2] === 'true'
                        : parts.slice(2);
                }
                if (!title.innerText) {
                    const h1 = this.content.querySelector('h1');
                    if (h1) {
                        title.innerText = h1.innerText;
                        h1.remove();
                    }
                    else {
                        const ttxt = document.getElementById('deck')?.innerText.split('::').pop();
                        if (ttxt)
                            title.innerText = ttxt;
                        else
                            title.remove();
                    }
                }
            }
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
                    .forEach(nd => nd.hidden = true);
            if (!this.cfg.show.info) {
                const el = document.querySelector('#info.additional-content');
                if (el)
                    el.hidden = true;
            }
            if (this.cfg.front)
                this.viewport.onscroll = (_evt) => sessionStorage.setItem('fc2_scroll_top', this.viewport.scrollTop.toString());
            if (!this.listeners) {
                document.addEventListener("click", this.mouse.bind(this));
                document.addEventListener("keydown", this.keyboard.bind(this));
                this.listeners = true;
            }
            this.content.style.display = 'block';
            document.getElementById('fc2-content-placeholder').remove();
            window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.requestAnimationFrame(() => this.scroll_to({ scroll: this.cfg.scroll.initial }))));
        }
        generate_expose() {
            this.log('generate_expose');
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
        show(el) {
            this.log('show', el.tagName);
            if (!el?.classList.contains('hide'))
                return;
            el.classList.remove('hide');
            el.innerHTML = el.dataset.cloze;
            for (const child of el.querySelectorAll(':scope .cloze, :scope .cloze-inactive'))
                this.hide(child);
        }
        hide(el) {
            this.log('hide');
            if (el?.classList.contains('hide'))
                return;
            el.classList.add('hide');
            if (!this.search.hidden)
                this.search.hidden = true;
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
        iter(fwd) {
            this.log('iter');
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
        toggle_cloze(cloze) {
            this.log('toggle_cloze');
            const show = cloze.classList.contains('hide');
            if (show)
                this.show(cloze);
            else
                this.hide(cloze);
            return show;
        }
        toggle_field(field) {
            this.log('toggle_field');
            const fld = field.parentElement?.querySelector('.additional-content');
            fld.hidden = !fld.hidden;
        }
        toggle_all(show = undefined) {
            this.log('toggle_all');
            if (show === true || this.search.hidden ||
                show === undefined &&
                    this.content.querySelector('.cloze.hide, .cloze-inactive.hide, .additional-content[hidden]')) {
                this.content.querySelectorAll('.cloze.hide, .cloze-inactive.hide')
                    .forEach(el => { this.show(el); });
                this.viewport.querySelectorAll('.additional-content[hidden]')
                    .forEach(el => { el.hidden = false; });
                this.search.hidden = false;
                return true;
            }
            else {
                this.content.querySelectorAll('.cloze:not(.hide), .cloze-inactive:not(.hide)')
                    .forEach(el => { this.hide(el); });
                this.viewport.querySelectorAll('.additional-content:not([hidden])')
                    .forEach(el => { el.hidden = true; });
                this.search.hidden = true;
                return false;
            }
        }
        scroll_to(opts) {
            this.log('scroll_to');
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
                this.log('    line_height');
                return parseInt(style.height) + parseInt(style.marginTop) + parseInt(style.marginBottom)
                    || parseInt(style.lineHeight)
                    || 20;
            };
            const vp_height = this.viewport.clientHeight;
            const cloze_top = (first.getBoundingClientRect().top - offset) - line_height(window.getComputedStyle(first?.previousElementSibling || first, ':before')) + 3;
            let top;
            const bottom = (last.getBoundingClientRect().bottom - offset) + line_height(window.getComputedStyle(last?.nextElementSibling || last, ':after')) + 3;
            let y = 0;
            if (opts.scroll?.slice(0, 7) === 'context') {
                top = 0;
                let section, section_seen, cloze_seen;
                const sections = this.content.querySelectorAll('hr, h1, h2, h3, h4, h5, h6, .cloze');
                for (let i = 0; i < sections.length; i++) {
                    cloze_seen || (cloze_seen = sections[i].tagName === 'SPAN');
                    section_seen || (section_seen = sections[i].tagName !== 'SPAN');
                    if (!cloze_seen)
                        section = sections[i];
                    if (cloze_seen && (section || section_seen))
                        break;
                }
                if (section) {
                    top = section.tagName === 'HR'
                        ? (section.getBoundingClientRect().bottom - offset)
                        : (section.getBoundingClientRect().top - offset) - 5;
                }
                else if (!section_seen) {
                    const all = this.content.querySelectorAll('.cloze, .cloze-inactive');
                    for (let i = 1; i < all.length; i++) {
                        if (all[i] === this.current) {
                            top = (all[i - 1].getBoundingClientRect().top - offset) - 5;
                            break;
                        }
                    }
                }
            }
            else
                top = cloze_top;
            if (['center', 'context', 'context-bottom'].includes(opts.scroll)) {
                if (bottom - top <= vp_height)
                    opts.scroll === 'context-bottom'
                        ? y = bottom - vp_height
                        : y = top + (bottom - top) / 2 - vp_height / 2;
                else if (this.cfg.front)
                    y = top;
                else
                    y = bottom - cloze_top <= vp_height
                        ? bottom - vp_height
                        : cloze_top;
            }
            else {
                if (cloze_top < 0 || bottom - top >= vp_height)
                    y = cloze_top;
                else if (bottom > vp_height)
                    y = bottom - vp_height;
            }
            this.log(`    scrolling ${opts.scroll} to`, this.viewport.scrollTop + y);
            if (y)
                this.viewport.scrollTop += y;
        }
        mouse(evt) {
            this.log('mouse event');
            const target = evt.target;
            const classes = target.classList;
            if (classes.contains('cloze') || classes.contains('cloze-inactive')) {
                evt.stopPropagation();
                if (!document.getSelection()?.toString()) {
                    if (!this.cfg.iteration.top)
                        this.current = target;
                    this.toggle_cloze(target);
                    this.scroll_to({ scroll: this.cfg.scroll.click, cloze: target });
                }
            }
            else if (classes.contains('additional-header') || classes.contains('additional-content')) {
                if (!document.getSelection()?.toString())
                    this.toggle_field(target);
            }
            else if (target.id === 'fc2-show-all-btn')
                this.search.hidden = !this.toggle_all();
            else if (target.id === 'nav-toggle-all')
                this.search.hidden = !this.toggle_all();
            else if (target.id === 'nav-prev-cloze')
                this.iter(false);
            else if (target.id === 'nav-next-cloze')
                this.iter(true);
        }
        keyboard(evt) {
            this.log('keyboard event');
            if (evt.key === 'Escape' && !this.search.panel.hidden) {
                this.search.hidden = true;
                evt.stopImmediatePropagation();
            }
            else if (evt.key === this.cfg.shortcuts.next)
                this.iter(true);
            else if (evt.key === this.cfg.shortcuts.previous)
                this.iter(false);
            else if (evt.key === this.cfg.shortcuts.toggle_all)
                this.toggle_all();
            else if (evt.key === 'f' && evt.ctrlKey && !evt.metaKey) {
                if (this.search.hidden)
                    this.toggle_all(true);
                this.search.focus();
            }
            else
                return;
            evt.stopPropagation();
            evt.preventDefault();
        }
    }

    fc2 || (fc2 = new FC2);
    fc2.load(config, __TEMPLATE_SIDE__);

})();
