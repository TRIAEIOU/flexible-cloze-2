"use strict";
var fc2;
fc2 ||= (() => {
    const self = ((config, side) => {
        self.log = self.logger(document.getElementById('fc2-scroll-area').parentElement, config.log);
        self.cfg = config;
        self.cfg.front = side === 'front';
        self.content = document.getElementById('fc2-content');
        self.viewport = document.getElementById('fc2-scroll-area');
        self.search = self.searcher(self.viewport, self.content);
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
    self.logger = (parent, lvl) => {
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
            log.element.id = 'log-panel';
            log.element.hidden = true;
            log.element = parent.appendChild(log.element);
        }
        return log;
    };
    self.searcher = (scroll, content) => {
        const fn = (() => {
            self.log('searcher()');
            if (!fn.field?.value) {
                fn.clear();
                return;
            }
            if (fn.field.value !== fn.sstr) {
                fn.clear();
                fn.sstr = fn.field.value;
                highlight(RegExp(fn.sstr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'gi'));
            }
            if (fn.matches?.length) {
                if (fn.index >= 0)
                    fn.matches[fn.index].classList.replace('search-match', 'search-matches');
                fn.index = fn.index < fn.matches.length - 1
                    ? fn.index + 1
                    : 0;
                fn.matches[fn.index].classList.replace('search-matches', 'search-match');
                fn.matches[fn.index].scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
            }
            function highlight(re) {
                self.log('searcher.highlight()');
                const txt = fn.content.textContent;
                const rct = fn.scroll.getBoundingClientRect();
                const stl = getComputedStyle(fn.content);
                const offset = {
                    top: fn.scroll.scrollTop - rct.top - parseFloat(stl.marginTop),
                    left: fn.scroll.scrollLeft - rct.left - parseFloat(stl.marginLeft)
                };
                let match, sstr = fn.field.value;
                const sel = window.getSelection();
                sel.removeAllRanges();
                while (match = re.exec(txt)) {
                    const itr = nd_itr(fn.content);
                    let index = 0;
                    let res = itr.next();
                    while (!res.done) {
                        let rng;
                        if (match.index >= index && match.index < index + res.value.length) {
                            rng = new Range();
                            rng.setStart(res.value, match.index - index);
                        }
                        if (match.index + sstr.length >= index &&
                            match.index + sstr.length < index + res.value.length) {
                            rng.setEnd(res.value, match.index + sstr.length - index);
                            sel.addRange(rng);
                            for (const rect of rng.getClientRects()) {
                                const light = document.createElement('DIV');
                                light.innerText = rng.toString();
                                fn.content.appendChild(light);
                                light.classList.add('search-matches');
                                light.style.top = rect.y + offset.top + 'px';
                                light.style.left = rect.x + offset.left + 'px';
                                light.style.height = rect.height + 'px';
                                light.style.width = rect.width + 'px';
                                fn.matches.push(light);
                            }
                        }
                        index += res.value.length;
                        res = itr.next();
                    }
                }
                sel.removeAllRanges();
            }
            function* nd_itr(nd) {
                for (const cnd of nd.childNodes) {
                    if (cnd.nodeType === Node.TEXT_NODE)
                        yield cnd;
                    else
                        yield* nd_itr(cnd);
                }
            }
        });
        fn.clear = () => {
            self.log('searcher.clear()');
            for (const el of fn.matches)
                el.remove();
            fn.index = -1, fn.sstr = '', fn.matches = [];
        };
        fn.scroll = scroll, fn.content = content;
        fn.matches = [], fn.index = -1, fn.sstr = '';
        const panel = document.createElement('div');
        panel.id = 'search-panel';
        panel.hidden = true;
        panel.innerHTML = '<input type="text" id="search-field" placeholder="Search for text"/><div id="search-btn" tabindex="0">Search</div>';
        fn.panel = scroll.parentElement.appendChild(panel);
        fn.field = document.getElementById('search-field');
        fn.field.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter') {
                fn();
                fn.button.focus();
                if (!document.documentElement.classList.contains('mobile'))
                    fn.field.focus();
            }
            else if (evt.key === 'Escape')
                fn.hide();
            evt.stopPropagation();
        });
        fn.button = document.getElementById('search-btn');
        fn.button.onclick = fn;
        fn.show = () => {
            self.log('searcher.show()');
            fn.panel.hidden = false;
            fn.field.select();
            fn.field.focus();
        };
        fn.hide = () => {
            self.log('searcher.hide()');
            fn.clear();
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
    return document.querySelector('.cloze')['dataset'].ordinal !== undefined
        ? self
        : null;
})();
fc2(config, __TEMPLATE_SIDE__);
