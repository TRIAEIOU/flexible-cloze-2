"use strict";
var fc2;
fc2 ||= ((config) => {
    const self = ((config, side) => {
        self.log = self.logger(config.log);
        self.cfg = config;
        self.cfg.front = side === 'front';
        self.content = document.getElementById('fc2-content');
        self.viewport = document.getElementById('fc2-scroll-area');
        self.search = self.searcher();
        self.current = self.content.querySelector('.cloze');
        self.ordinal ||= parseInt(self.current.dataset.ordinal);
        self.expose = self.generate_expose();
        self.content.parentElement.classList.remove(self.cfg.front ? 'back' : 'front');
        self.content.parentElement.classList.add(self.cfg.front ? 'front' : 'back');
        const tag_el = document.querySelector('#fc2-additional #tags');
        if (tag_el) {
            for (const tag of tag_el.innerText.split(' ').slice(1)) {
                if (!tag.startsWith('fc2.cfg.'))
                    continue;
                const parts = tag.slice(8).split('.');
                const tag_side = ['front', 'back'].includes(parts[0]) ? parts.shift() : undefined;
                if (tag_side && tag_side !== side || self.cfg[parts[0]]?.[parts[1]] === undefined)
                    continue;
                typeof (self.cfg[parts[0]][parts[1]]) === 'boolean'
                    ? parts[2] === 'true'
                    : parts.slice(2);
            }
        }
        self.content.querySelectorAll('.cloze').forEach(((cloze) => {
            self.expose(cloze);
            if (self.cfg.front)
                self.hide(cloze);
        }));
        self.content.querySelectorAll('.cloze-inactive').forEach(((cloze) => {
            if (self.expose(cloze) || cloze.querySelector('.cloze'))
                cloze.classList.remove('cloze-inactive');
            else if (!self.cfg.show.inactive)
                self.hide(cloze);
        }));
        if (!self.cfg.show.additional)
            self.viewport.querySelectorAll(':not(#info).additional-content')
                .forEach(nd => self.hide(nd));
        if (!self.cfg.show.info)
            self.hide(document.querySelector('#info.additional-content'));
        if (self.cfg.front)
            self.viewport.onscroll = (_evt) => sessionStorage.setItem('fc2_scroll_top', self.viewport.scrollTop.toString());
        document.addEventListener("click", self.mouse);
        document.addEventListener("keydown", self.keyboard);
        self.content.style.display = 'block';
        document.getElementById('fc2-content-placeholder').style.display = 'none';
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.requestAnimationFrame(() => self.scroll_to({ scroll: self.cfg.scroll.initial }))));
    });
    self.logger = (lvl) => {
        let log = () => { };
        if (lvl) {
            if (lvl === true) {
                log = (str, args) => {
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
                };
            }
            window.onerror = (emsg, _src, _ln, _col, err) => {
                if (log.element.hidden)
                    log.element.hidden = false;
                log.element.innerText += `error ${emsg}:\n${err.stack}\n`;
                log.element.scrollTop = log.element.scrollHeight;
                return true;
            };
            log.element = document.createElement('pre');
            log.element.id = 'fc2-log';
            log.element.hidden = true;
            log.element = document.getElementById('fc2-scroll-area')
                ?.parentElement?.appendChild(log.element);
        }
        return log;
    };
    self.searcher = () => {
        const fn = (() => {
            if (!fn.field?.value) {
                fn.matches = fn.unwrap(fn.matches), fn.index = -1;
                fn.sstr = '';
                return;
            }
            if (!fn.matches?.length || fn.field.value !== fn.sstr) {
                fn.matches = fn.unwrap(fn.matches), fn.index = -1;
                fn.sstr = fn.field.value;
                const re = new RegExp(fn.sstr, 'gi');
                fn.matches = fn.wrap(fn.match(re, self.content), re);
            }
            if (fn.matches?.length) {
                if (fn.index >= 0)
                    fn.matches[fn.index].classList.replace('search-match', 'search-matches');
                fn.index = (fn.index < fn.matches.length)
                    ? fn.index + 1
                    : 0;
                fn.matches[fn.index].classList.replace('search-matches', 'search-match');
                fn.matches[fn.index].scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
            }
        });
        fn.matches = [], fn.index = -1, fn.sstr = '';
        const panel = document.createElement('div');
        panel.id = 'fc2-search';
        panel.hidden = true;
        panel.innerHTML = '<input type="text" id="fc2-search-field" placeholder="Search for text"/><div id="fc2-search-btn" tabindex="0" onclick="fc2.search();">SEARCH</div>';
        fn.panel = document.getElementById('fc2-scroll-area').parentElement.appendChild(panel);
        fn.field = document.getElementById('fc2-search-field');
        fn.field.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter') {
                if (document.documentElement.classList.contains('mobile'))
                    fn.button.focus();
                fn();
            }
            else if (evt.key === 'Escape')
                fn.hide();
            evt.stopPropagation();
        });
        fn.button = document.getElementById('fc2-search-btn');
        fn.match = (re, nd) => {
            let res = [];
            for (const cnd of nd.childNodes) {
                re.lastIndex = 0;
                if (cnd.nodeType === Node.TEXT_NODE && re.test(cnd.textContent))
                    res.push(cnd);
                else if (cnd.nodeType === Node.ELEMENT_NODE && re.test(cnd['innerText']))
                    res = res.concat(fn.match(re, cnd));
            }
            return res;
        };
        fn.wrap = (nds, re) => {
            if (!nds?.length)
                return [];
            const res = [];
            for (const nd of nds) {
                const parent = nd.parentElement;
                const nxt = nd.nextSibling;
                const txt = parent.removeChild(nd).textContent;
                let m, last = re.lastIndex = 0;
                while (m = re.exec(txt)) {
                    parent.insertBefore(document.createTextNode(txt.slice(last, m.index)), nxt);
                    const span = document.createElement('span');
                    span.textContent = m[0];
                    span.classList.add('search-matches');
                    res.push(parent.insertBefore(span, nxt));
                    last = re.lastIndex;
                }
                if (last < txt.length) {
                    parent.insertBefore(document.createTextNode(txt.slice(last)), nxt);
                }
            }
            return res;
        };
        fn.unwrap = (els) => {
            if (els) {
                for (const el of els)
                    el.parentElement?.replaceChild(document.createTextNode(el.textContent), el);
            }
            self.content.normalize();
            return [];
        };
        fn.show = () => {
            self.log('searcher.show');
            fn.panel.hidden = false;
            fn.field.focus();
        };
        fn.hide = () => {
            self.log('searcher.hide');
            fn.matches = fn.unwrap(fn.matches), fn.index = -1;
            fn.panel.hidden = true;
        };
        return fn;
    };
    self.generate_expose = () => {
        self.log('generate_expose');
        let expose_;
        if (self.cfg.expose.pos === 'pre') {
            expose_ = (el) => {
                if (el.previousSibling?.data?.endsWith(self.cfg.expose.char))
                    el.previousSibling.data = el.previousSibling.data.slice(0, -1);
                else
                    return false;
                return true;
            };
        }
        else if (self.cfg.expose.pos === 'post') {
            expose_ = (el) => {
                if (el.nextSibling?.data?.startsWith(self.cfg.expose.char))
                    el.nextSibling.data = el.nextSibling.data.substring(1);
                else
                    return false;
                return true;
            };
        }
        else if (self.cfg.expose.pos === 'end') {
            expose_ = (el) => {
                if (el.dataset.cloze?.endsWith(self.cfg.expose.char))
                    el.dataset.cloze = el.dataset.cloze.slice(0, -1);
                else if (el.lastChild?.data?.endsWith(self.cfg.expose.char))
                    el.lastChild.data = el.lastChild.data.slice(0, -1);
                else
                    return false;
                return true;
            };
        }
        else {
            expose_ = (el) => {
                if (el.dataset.cloze?.startsWith(self.cfg.expose.char))
                    el.dataset.cloze = el.dataset.cloze.substring(1);
                else if (el.firstChild?.data?.startsWith(self.cfg.expose.char))
                    el.firstChild.data = el.firstChild.data.substring(1);
                else
                    return false;
                return true;
            };
        }
        return self.cfg.expose.reverse ? (el) => { return !expose_(el); } : expose_;
    };
    self.show = (el) => {
        self.log('show', el.tagName);
        if (!el?.classList.contains('hide'))
            return;
        el.classList.remove('hide');
        if (el.classList.contains('additional-content'))
            return;
        el.innerHTML = el.dataset.cloze;
        for (const child of el.querySelectorAll(':scope .cloze, :scope .cloze-inactive'))
            self.hide(child);
    };
    self.hide = (el) => {
        self.log('hide');
        if (!el || el.classList.contains('hide'))
            return;
        el.classList.add('hide');
        if (el.classList.contains('additional-content'))
            return;
        if (el.dataset.cloze === undefined)
            el.dataset.cloze = el.innerHTML;
        if (el.dataset.hint === undefined) {
            if (el.innerHTML === '[...]' || el.classList.contains('cloze-inactive'))
                el.dataset.hint = self.cfg.prompt;
            else
                el.dataset.hint = "";
        }
        el.innerHTML = el.dataset.hint;
    };
    self.iter = (fwd) => {
        self.log('iter');
        const els = self.content.querySelectorAll('.cloze');
        let nxt;
        if (self.current?.classList.contains('hide'))
            nxt = self.current;
        if (fwd && self.current === els[els.length - 1])
            nxt = self.cfg.iteration.loop ? els[0] : self.current;
        else if (!fwd && self.current === els[0])
            nxt = self.cfg.iteration.loop ? els[els.length - 1] : self.current;
        for (let i = 0; !nxt && i < els.length; i++) {
            if (els[i] === self.current)
                nxt = els[i + (fwd ? 1 : -1)];
        }
        if (nxt !== self.current && self.cfg.iteration.hide)
            self.hide(self.current);
        self.show(self.current = nxt);
        self.scroll_to({ scroll: self.cfg.scroll.iterate, cloze: self.current });
    };
    self.toggle_cloze = (cloze) => {
        self.log('toggle_cloze');
        cloze.classList.contains('hide') ? self.show(cloze) : self.hide(cloze);
    };
    self.toggle_field = (field) => {
        self.log('toggle_field');
        field.classList.contains('hide')
            ? field.classList.remove('hide')
            : field.classList.add('hide');
    };
    self.toggle_all = (show = undefined) => {
        self.log('toggle_all');
        if (show === true || ((show === undefined) &&
            self.content.querySelector('.cloze.hide, .cloze-inactive.hide'))) {
            self.content.querySelectorAll('.cloze.hide, .cloze-inactive.hide')
                .forEach(el => { self.show(el); });
            return true;
        }
        else {
            self.content.querySelectorAll('.cloze:not(.hide), .cloze-inactive:not(.hide)')
                .forEach(el => { self.hide(el); });
            return false;
        }
    };
    self.scroll_to = (opts) => {
        self.log('scroll_to');
        if (!self.cfg.front) {
            const scroll_top = parseFloat(sessionStorage.getItem('fc2_scroll_top'));
            if (!isNaN(scroll_top)) {
                sessionStorage.removeItem('fc2_scroll_top');
                self.viewport.scrollTop = scroll_top;
            }
        }
        if (opts.scroll === 'none')
            return;
        let first, last;
        if (opts.cloze)
            first = last = opts.cloze;
        else {
            const active = self.content.querySelectorAll('.cloze');
            first = active[0];
            last = active[active.length - 1];
        }
        const offset = self.viewport.getBoundingClientRect().top;
        const line_height = (style) => {
            self.log('line_height');
            return parseInt(style.height) + parseInt(style.marginTop) + parseInt(style.marginBottom)
                || parseInt(style.lineHeight)
                || 20;
        };
        const vp_height = self.viewport.clientHeight;
        const cloze_top = (first.getBoundingClientRect().top - offset) - line_height(window.getComputedStyle(first?.previousElementSibling || first, ':before')) + 3;
        let top;
        const bottom = (last.getBoundingClientRect().bottom - offset) + line_height(window.getComputedStyle(last?.nextElementSibling || last, ':after')) + 3;
        let y = 0;
        if (opts.scroll?.slice(0, 7) === 'context') {
            top = 0;
            let section, section_seen, cloze_seen;
            const sections = self.content.querySelectorAll('hr, h1, h2, h3, h4, h5, h6, .cloze');
            for (let i = 0; i < sections.length; i++) {
                cloze_seen ||= sections[i].tagName === 'SPAN';
                section_seen ||= sections[i].tagName !== 'SPAN';
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
                const all = self.content.querySelectorAll('.cloze, .cloze-inactive');
                for (let i = 1; i < all.length; i++) {
                    if (all[i] === self.current) {
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
            else if (self.cfg.front)
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
        self.log(`    scrolling ${opts.scroll} to`, self.viewport.scrollTop + y);
        if (y)
            self.viewport.scrollTop += y;
    };
    self.mouse = (evt) => {
        const target = evt.target;
        if (target.classList.contains('cloze')
            || target.classList.contains('cloze-inactive')) {
            evt.stopPropagation();
            if (!self.cfg.iteration.top)
                self.current = evt.target;
            self.toggle_cloze(evt.target);
            self.scroll_to({ scroll: self.cfg.scroll.click, cloze: evt.target });
        }
        else if (target.classList.contains('additional-header'))
            self.toggle_field(target.nextElementSibling);
        else if (target.classList.contains('additional-content'))
            self.toggle_field(evt.target);
        else if (target.id === 'fc2-show-all-btn') {
            self.toggle_all()
                ? self.search.show()
                : self.search.hide();
        }
        else if (target.id === 'nav-toggle-all') {
            self.toggle_all()
                ? self.search.show()
                : self.search.hide();
        }
        else if (target.id === 'nav-prev-cloze')
            self.iter(false);
        else if (target.id === 'nav-next-cloze')
            self.iter(true);
    };
    self.keyboard = (evt) => {
        if (evt.key === 'Escape' && !self.search.panel.hidden) {
            self.search.hide();
            evt.stopImmediatePropagation();
            evt.preventDefault();
        }
        else if (evt.key === self.cfg.shortcuts.next)
            self.iter(true);
        else if (evt.key === self.cfg.shortcuts.previous)
            self.iter(false);
        else if (evt.key === self.cfg.shortcuts.toggle_all)
            self.toggle_all()
                ? self.search.show()
                : self.search.hide();
        else if (evt.key === 'f' && evt.ctrlKey && !evt.metaKey) {
            if (self.search.panel.hidden) {
                self.toggle_all(true);
                self.search.show();
            }
            else
                self.search.field.focus();
        }
    };
    if (document.querySelector('.cloze')['dataset'].ordinal === undefined)
        return;
    return self;
})(config);
fc2(config, __TEMPLATE_SIDE__);
