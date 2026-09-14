/**
 * Filters a slotted list of plugins by free text and by category. The list is
 * ordinary light-DOM markup rendered by the site generator, so every plugin is
 * visible before the element upgrades or when JavaScript is off; the controls
 * only appear once it has.
 *
 * Items are the descendants matching `[data-plugin]`. Each carries
 * `data-category` and `data-search` (the lower-cased text to match against).
 *
 * @summary Search box and category filter for a list of plugins.
 *
 * @slot - The list of `[data-plugin]` items.
 * @csspart controls - Wrapper around the search box and the category buttons.
 * @csspart search - The search input.
 * @csspart categories - The group of category buttons.
 * @csspart count - The live "n of m plugins" status line.
 * @cssprop --plugin-filter-gap - Space between the controls and the list.
 * @fires filter-change - Fired after filtering, with `detail: { query, category, visible }`.
 *
 * @demo
 * ```html
 * <plugin-filter>
 *   <ul>
 *     <li data-plugin data-category="weather" data-search="dwd weather warnings">dwd</li>
 *     <li data-plugin data-category="energy" data-search="smard electricity prices">smard</li>
 *   </ul>
 * </plugin-filter>
 * ```
 */
class PluginFilter extends HTMLElement {
    /** Free-text filter, matched case-insensitively against `data-search`. */
    private _query: string = '';
    /** Selected category; empty for all. */
    private _category: string = '';

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['query', 'category'];
    }

    /** Free-text filter, matched case-insensitively against `data-search`. */
    get query() {
        return this._query;
    }

    set query(value: string) {
        this._query = value;
        if (this.getAttribute('query') !== value) this.setAttribute('query', value);
        this.apply();
    }

    /** Selected category; empty for all. */
    get category() {
        return this._category;
    }

    set category(value: string) {
        this._category = value;
        if (this.getAttribute('category') !== value) this.setAttribute('category', value);
        this.apply();
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue === newValue) return;
        if (name === 'query') this.query = newValue ?? '';
        if (name === 'category') this.category = newValue ?? '';
    }

    connectedCallback() {
        this.render();
        this.apply();
    }

    private get items(): HTMLElement[] {
        return Array.from(this.querySelectorAll<HTMLElement>('[data-plugin]'));
    }

    private apply() {
        if (!this.shadowRoot || !this.isConnected) return;
        const needle = this._query.trim().toLowerCase();
        let visible = 0;
        for (const item of this.items) {
            const matches = (!this._category || item.dataset.category === this._category)
                && (!needle || (item.dataset.search ?? '').includes(needle));
            item.hidden = !matches;
            if (matches) visible++;
        }
        for (const button of this.shadowRoot.querySelectorAll<HTMLButtonElement>('button[data-category]')) {
            button.setAttribute('aria-pressed', String(button.dataset.category === this._category));
        }
        const input = this.shadowRoot.querySelector('input');
        if (input && input.value !== this._query) input.value = this._query;
        const count = this.shadowRoot.querySelector('[part="count"]');
        const total = this.items.length;
        if (count) {
            count.textContent = visible === total
                ? `${total} plugins`
                : visible === 0 ? 'No plugin matches.' : `${visible} of ${total} plugins`;
        }
        this.dispatchEvent(new CustomEvent('filter-change', {
            detail: { query: this._query, category: this._category, visible },
        }));
    }

    private render() {
        if (!this.shadowRoot) return;
        const categories = [...new Set(this.items.map(item => item.dataset.category ?? '').filter(Boolean))].sort();
        const escape = (s: string) => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
        const chip = (value: string, label: string) =>
            `<button type="button" data-category="${escape(value)}" aria-pressed="false">${escape(label)}</button>`;
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                [part="controls"] { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; align-items: center; }
                input {
                    flex: 1 1 16rem;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid color-mix(in oklab, var(--root-bg, #fff) 70%, var(--root-fg, #000));
                    border-radius: 0.5rem;
                    background: var(--root-bg, #fff);
                    color: var(--root-fg, #000);
                    font: inherit;
                }
                input:focus-visible, button:focus-visible { outline: 2px solid var(--brand, currentColor); outline-offset: 2px; }
                [part="categories"] { display: flex; flex-wrap: wrap; gap: 0.4rem; }
                button {
                    padding: 0.25rem 0.7rem;
                    border: 1px solid color-mix(in oklab, var(--root-bg, #fff) 70%, var(--root-fg, #000));
                    border-radius: 5rem;
                    background: transparent;
                    color: inherit;
                    font: inherit;
                    font-size: 0.85rem;
                    cursor: pointer;
                }
                button[aria-pressed="true"] { border-color: var(--brand, currentColor); background: var(--brand, #000); color: var(--on-brand, #fff); }
                [part="count"] { margin: 0.75rem 0 var(--plugin-filter-gap, 1rem); font-size: 0.9rem; opacity: 0.8; }
            </style>
            <div part="controls">
                <input part="search" type="search" placeholder="Filter by name, topic or API…" aria-label="Filter plugins" autocomplete="off">
                <div part="categories" role="group" aria-label="Category">
                    ${chip('', 'All')}${categories.map(c => chip(c, c)).join('')}
                </div>
            </div>
            <p part="count" role="status"></p>
            <slot></slot>
        `;
        this.shadowRoot.querySelector('input')?.addEventListener('input', event => {
            this.query = (event.target as HTMLInputElement).value;
        });
        for (const button of this.shadowRoot.querySelectorAll<HTMLButtonElement>('button[data-category]')) {
            button.addEventListener('click', () => { this.category = button.dataset.category ?? ''; });
        }
    }
}

customElements.define('plugin-filter', PluginFilter);
