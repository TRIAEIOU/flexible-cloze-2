"use strict";
var FC2;
FC2 ||= class {
    constructor(config) {
        if (config.log)
            this.log = this.logger(config.log);
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
            else if (target.id === 'fc2-show-all-btn') {
                this.toggle_all()
                    ? this.search.show()
                    : this.search.hide();
            }
            else if (target.id === 'nav-toggle-all') {
                this.toggle_all()
                    ? this.search.show()
                    : this.search.hide();
            }
            else if (target.id === 'nav-prev-cloze')
                this.iter(false);
            else if (target.id === 'nav-next-cloze')
                this.iter(true);
        });
        document.addEventListener("keydown", (evt) => {
            if (document.activeElement === this.search?.field)
                return;
            if (evt.key === this.cfg.shortcuts.next) {
                this.iter(true);
                evt.preventDefault();
            }
            else if (evt.key === this.cfg.shortcuts.previous) {
                this.iter(false);
                evt.preventDefault();
            }
            else if (evt.key === this.cfg.shortcuts.toggle_all) {
                this.toggle_all()
                    ? this.search.show()
                    : this.search.hide();
                evt.preventDefault();
            }
        });
    }
    load(config, side) {
        this.cfg = config;
        this.cfg.front = side === 'front';
        this.content = document.getElementById('fc2-content');
        this.viewport = document.getElementById('fc2-scroll-area');
        this.search = this.searcher();
        this.current = this.content.querySelector('.cloze');
        this.ordinal ||= parseInt(this.current.dataset.ordinal);
        this.expose = this.generate_expose();
        this.content.parentElement.classList.remove(this.cfg.front ? 'back' : 'front');
        this.content.parentElement.classList.add(this.cfg.front ? 'front' : 'back');
        const tag_el = document.querySelector('#fc2-additional #tags');
        if (tag_el) {
            for (const tag of tag_el.innerText.split(' ').slice(1)) {
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
                .forEach(nd => this.hide(nd));
        if (!this.cfg.show.info)
            this.hide(document.querySelector('#info.additional-content'));
        if (this.cfg.front)
            this.viewport.onscroll = (_evt) => sessionStorage.setItem('fc2_scroll_top', this.viewport.scrollTop.toString());
        this.content.style.display = 'block';
        document.getElementById('fc2-content-placeholder').style.display = 'none';
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.requestAnimationFrame(() => this.scroll_to({ scroll: this.cfg.scroll.initial }))));
    }
    logger(lvl) {
        let log = () => { };
        if (lvl) {
            if (lvl === true) {
                log = (str, args) => {
                    if (log.element.hidden)
                        log.element.hidden = false;
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
            log.element = document.getElementById('fc2-scroll-area')?.parentElement?.appendChild(log.element);
        }
        return log;
    }
    searcher() {
        const searchfn = (() => {
            searchfn.match = (str, nd, res) => {
                this.log('searchfn.match');
                let found = false;
                for (const child of nd.childNodes)
                    found = searchfn.match(str, child, res) || found;
                if (!found && nd['innerText']?.indexOf(str) >= 0) {
                    found = true;
                    res.push(nd);
                }
                return found;
            };
            if (!searchfn.field?.value)
                return;
            if (!searchfn.matches?.length || searchfn.field.value !== searchfn.str) {
                this.log('searchfn.searching');
                for (const el of searchfn.matches)
                    el.classList.remove('search-match');
                searchfn.matches = [];
                searchfn.index = -1;
                searchfn.match(searchfn.field.innerText, this.content, searchfn.matches);
                for (const el of searchfn.matches)
                    el.classList.add('search-match');
            }
            if (searchfn.matches?.length) {
                searchfn.index = searchfn.index === searchfn.matches.length - 1
                    ? 0
                    : searchfn.index + 1;
                this.log(`  searchfn found match, scrolling to index ${searchfn.index}`);
                searchfn.matches[searchfn.index].scrollIntoView();
            }
        });
        searchfn.matches = [];
        searchfn.index = -1;
        const panel = document.createElement('div');
        panel.id = 'fc2-search';
        panel.hidden = true;
        panel.innerHTML = '<input type="text" id="fc2-search-field" placeholder="Type to search"/><div id="fc2-search-btn" onclick="fc2.search();">SEARCH</div>';
        searchfn.panel = document.getElementById('fc2-scroll-area').parentElement.appendChild(panel);
        searchfn.field = document.getElementById('fc2-search-field');
        searchfn.show = () => {
            fc2.log('searcher.show');
            searchfn.panel.hidden = false;
            searchfn.field.focus();
        };
        searchfn.hide = () => {
            fc2.log('searcher.hide');
            for (const nd of searchfn.matches)
                nd.classList.remove('search-match');
            searchfn.panel.hidden = true;
        };
        return searchfn;
    }
    generate_expose() {
        this.log('generate_expose', arguments);
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
        this.log('hide', arguments);
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
        this.log('show', arguments);
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
        this.log('toggle_cloze', arguments);
        cloze.classList.contains('hide') ? this.show(cloze) : this.hide(cloze);
    }
    toggle_field(field) {
        this.log('toggle_field', arguments);
        field.classList.contains('hide')
            ? field.classList.remove('hide')
            : field.classList.add('hide');
    }
    toggle_all() {
        this.log('toggle_all', arguments);
        if (this.content.querySelector('.cloze.hide, .cloze-inactive.hide')) {
            this.content.querySelectorAll('.cloze.hide, .cloze-inactive.hide')
                .forEach(el => { this.show(el); });
            return true;
        }
        else {
            this.content.querySelectorAll('.cloze:not(.hide), .cloze-inactive:not(.hide)')
                .forEach(el => { this.hide(el); });
            return false;
        }
    }
    iter(fwd) {
        this.log('iter', arguments);
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
        this.log('scroll_to', arguments);
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
            this.log('line_height');
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
};
var fc2;
fc2 ||= new FC2(config);
fc2.load(config, __TEMPLATE_SIDE__);
