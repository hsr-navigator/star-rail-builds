import { compareCharacterCards } from './character-sort.mjs';

type FilterKind =
    | 'character'
    | 'relic'
    | 'lightCone';

const sortStorageKeys = {
    character: 'star-rail-builds:character-sort',
    relic: 'star-rail-builds:relic-sort',
    lightCone: 'star-rail-builds:light-cone-sort',
} as const;
const highPriorityImageCount = 4;

const selectors = {
    character: {
        form: '[data-character-filters]',
        card: '[data-character-card]',
        count: '[data-character-count]',
        empty: '[data-character-empty]',
    },

    lightCone: {
        form: '[data-light-cone-filters]',
        card: '[data-light-cone-card]',
        count: '[data-light-cone-count]',
        empty: '[data-light-cone-empty]',
    },
    relic: {
        form: '[data-relic-filters]',
        card: '[data-relic-card]',
        count: '[data-relic-count]',
        empty: '[data-relic-empty]',
    },
} as const;

const kind = (Object.keys(selectors) as FilterKind[]).find((candidate) =>
    document.querySelector(selectors[candidate].form),
);

const cardValue = (card: HTMLElement, name: string) => card.dataset[name] ?? '';

function compareVersionNewest(
    left: string,
    right: string,
) {
    const parseVersion = (version: string) => {
        const match = version
            .trim()
            .match(/^(\d+)(?:\.(\d+))?/);

        if (!match) {
            return null;
        }

        return {
            major: Number(match[1]),
            minor: Number(match[2] ?? 0),
        };
    };

    const leftVersion = parseVersion(left);
    const rightVersion = parseVersion(right);

    // If neither has a release version,
    // leave their relative ordering to the name sort.
    if (!leftVersion && !rightVersion) {
        return 0;
    }

    // Missing release versions always go last.
    if (!leftVersion) {
        return 1;
    }

    if (!rightVersion) {
        return -1;
    }

    return (
        rightVersion.major - leftVersion.major ||
        rightVersion.minor - leftVersion.minor
    );
}

function compareCatalogCards(
    left: HTMLElement,
    right: HTMLElement,
    sort: string,
    kind?: FilterKind,
) {
    const byName = cardValue(
        left,
        'name',
    ).localeCompare(
        cardValue(right, 'name'),
    );

    /*
     * Relic A-Z:
     * Cavern first, then Planar,
     * with each group sorted A-Z.
     */
    if (
        kind === 'relic' &&
        sort === 'name'
    ) {
        const typeOrder: Record<
            string,
            number
        > = {
            cavern: 0,
            planar: 1,
        };

        const byType =
            (typeOrder[
                cardValue(left, 'type')
            ] ?? 99) -
            (typeOrder[
                cardValue(right, 'type')
            ] ?? 99);

        return byType || byName;
    }

    /*
 * Light Cone base stat sorting.
 * Highest max-level base stat first,
 * then A-Z when two Light Cones tie.
 */
    if (
        kind === 'lightCone' &&
        (
            sort === 'baseHp' ||
            sort === 'baseAtk' ||
            sort === 'baseDef'
        )
    ) {
        const leftValue =
            Number.parseFloat(
                cardValue(left, sort),
            );

        const rightValue =
            Number.parseFloat(
                cardValue(right, sort),
            );

        const safeLeft =
            Number.isFinite(leftValue)
                ? leftValue
                : Number.NEGATIVE_INFINITY;

        const safeRight =
            Number.isFinite(rightValue)
                ? rightValue
                : Number.NEGATIVE_INFINITY;

        return (
            safeRight - safeLeft ||
            byName
        );
    }

    if (sort === 'release') {
        return (
            Number.parseFloat(
                cardValue(
                    right,
                    'versionReleased',
                ),
            ) -
            Number.parseFloat(
                cardValue(
                    left,
                    'versionReleased',
                ),
            ) ||
            byName
        );
    }

    return byName;
}

if (kind) {
    const selector = selectors[kind];
    const form = document.querySelector<HTMLFormElement>(selector.form);
    const cards = Array.from(
        document.querySelectorAll<HTMLElement>(selector.card),
    );
    const count = document.querySelector<HTMLElement>(selector.count);
    const empty = document.querySelector<HTMLElement>(selector.empty);
    const sortSelect = form?.elements.namedItem('sort');
    const sortStorageKey = sortStorageKeys[kind];

    // Keep filter values separate for each catalog, shared across languages.
    // Search text stays temporary; sorting retains its existing storage keys.
    const filterStorageKey = `star-rail-builds:${kind}-filters`;
    const filterControls = Array.from(
        form?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
            'input[name], select[name]',
        ) ?? [],
    ).filter((control) =>
        !['search', 'sort'].includes(control.name) &&
        (control instanceof HTMLSelectElement ||
            ['radio', 'checkbox'].includes(control.type)),
    );

    try {
        const saved: unknown = JSON.parse(
            localStorage.getItem(filterStorageKey) ?? '{}',
        );
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
            for (const control of filterControls) {
                const value = (saved as Record<string, unknown>)[control.name];
                if (typeof value !== 'string') continue;

                if (control instanceof HTMLSelectElement) {
                    if ([...control.options].some((option) => option.value === value)) {
                        control.value = value;
                    }
                } else if (control.type === 'checkbox') {
                    if (value === '' || value === control.value) {
                        control.checked = value === control.value;
                    }
                } else {
                    const valid = filterControls.some((candidate) =>
                        candidate.name === control.name && candidate.value === value,
                    );
                    if (valid) control.checked = control.value === value;
                }
            }
        }
    } catch {
        // Invalid or unavailable storage must not prevent browsing.
    }

    form?.addEventListener('change', () => {
        const filters: Record<string, string> = {};
        for (const control of filterControls) {
            if (control instanceof HTMLSelectElement) {
                filters[control.name] = control.value;
            } else if (control.type === 'checkbox') {
                filters[control.name] = control.checked ? control.value : '';
            } else if (control.checked) {
                filters[control.name] = control.value;
            }
        }
        try {
            localStorage.setItem(filterStorageKey, JSON.stringify(filters));
        } catch {
            // Filtering still works when storage is blocked.
        }
    });

    const getElementYPosition = (element: HTMLElement) => {
        let currentElement: HTMLElement | null = element;
        let elementYPosition = 0;

        while (currentElement) {
            elementYPosition += currentElement.offsetTop;
            currentElement = currentElement.offsetParent as HTMLElement | null;
        }

        return elementYPosition;
    };

    const updateVisibleImageLoading = () => {
        const orderedCards = cards[0]?.parentElement
            ? Array.from(
                cards[0].parentElement.querySelectorAll<HTMLElement>(selector.card),
            )
            : cards;
        let highPriorityCount = 0;

        orderedCards.forEach((card) => {
            const image = card.querySelector<HTMLImageElement>('img');
            if (!image) return;

            const isAboveFold =
                !card.hidden && getElementYPosition(image) <= window.innerHeight;

            image.setAttribute('loading', isAboveFold ? 'eager' : 'lazy');
            if (isAboveFold && highPriorityCount < highPriorityImageCount) {
                image.setAttribute('fetchpriority', 'high');
                highPriorityCount += 1;
            } else {
                image.removeAttribute('fetchpriority');
            }
        });
    };

    if (sortSelect instanceof HTMLSelectElement) {
        try {
            const savedSort = localStorage.getItem(sortStorageKey);
            if (
                savedSort &&
                [...sortSelect.options].some((option) => option.value === savedSort)
            ) {
                sortSelect.value = savedSort;
            }
        } catch {
            // Storage can be unavailable in private or restricted browser contexts.
        }

        sortSelect.addEventListener('change', () => {
            try {
                localStorage.setItem(sortStorageKey, sortSelect.value);
            } catch {
                // Sorting still works for the current visit without persistence.
            }
        });
    }

    const applyFilters = () => {
        if (!form) return;

        const values = Object.fromEntries(new FormData(form));
        const search = String(values.search ?? '')
            .trim()
            .toLowerCase();
        let visibleCount = 0;

        if (sortSelect instanceof HTMLSelectElement) {
            const sort = String(values.sort ?? sortSelect.value);

            cards[0]?.parentElement?.append(
                ...[...cards].sort((left, right) =>
                    kind === 'character'
                        ? compareCharacterCards(left, right, sort)
                        : compareCatalogCards(
                            left,
                            right,
                            sort,
                            kind,
                        ),
                ),
            );
        }

        cards.forEach((card) => {
            const matches = Object.entries(values).every(([name, value]) => {
                const selected = String(value);
                if (!selected || name === 'search' || name === 'sort') return true;

                const key = name === 'updated' ? 'recentUpdated' : name;
                const cardValue = card.dataset[key] ?? '';
                return name === 'tagGroups'
                    ? cardValue.split(' ').includes(selected)
                    : cardValue === selected;
            });
            const visible =
                matches &&
                (!search || card.dataset.name?.toLowerCase().includes(search));

            card.hidden = !visible;
            if (visible) visibleCount += 1;
        });

        if (count) {
            count.textContent = `${visibleCount} ${count.dataset.resultsLabel ?? ''}`;
        }
        if (empty) empty.hidden = visibleCount > 0;
        updateVisibleImageLoading();
    };

    if (kind === 'character') {
        const pinStorageKey = 'star-rail-builds:pinned-characters';
        const pinToggle = document.querySelector<HTMLButtonElement>('[data-pin-toggle]');
        const pinHelp = document.querySelector<HTMLElement>('[data-pin-help]');
        const roster = document.querySelector<HTMLElement>('[data-roster-list]');
        let pinning = false;
        let pins = new Set<string>();

        const readPins = () => {
            try {
                const saved: unknown = JSON.parse(localStorage.getItem(pinStorageKey) ?? '[]');
                return new Set<string>(
                    Array.isArray(saved)
                        ? saved.filter((slug): slug is string => typeof slug === 'string')
                        : [],
                );
            } catch {
                return new Set<string>();
            }
        };

        // Preserve normal link semantics outside the explicit editing mode.
        const originalAttributes = new Map(cards.map((card) => [
            card,
            {
                label: card.getAttribute('aria-label'),
                role: card.getAttribute('role'),
                disabled: card.getAttribute('aria-disabled'),
                tabindex: card.getAttribute('tabindex'),
            },
        ]));

        const updatePinCards = () => {
            for (const card of cards) {
                const isPinned = pins.has(card.dataset.characterSlug ?? '');
                card.dataset.pinned = String(isPinned);
                const original = originalAttributes.get(card)!;
                if (pinning) {
                    card.setAttribute('role', 'button');
                    card.setAttribute('tabindex', '0');
                    card.removeAttribute('aria-disabled');
                    card.setAttribute('aria-pressed', String(isPinned));
                    card.setAttribute(
                        'aria-label',
                        `${isPinned ? card.dataset.unpinLabel : card.dataset.pinLabel}: ${card.dataset.name}`,
                    );
                } else {
                    card.removeAttribute('aria-pressed');
                    for (const [attribute, value] of [
                        ['aria-label', original.label],
                        ['role', original.role],
                        ['aria-disabled', original.disabled],
                        ['tabindex', original.tabindex],
                    ] as const) {
                        if (value === null) card.removeAttribute(attribute);
                        else card.setAttribute(attribute, value);
                    }
                }
            }
        };

        pins = readPins();
        updatePinCards();

        pinToggle?.addEventListener('click', () => {
            pinning = !pinning;
            pinToggle.setAttribute('aria-pressed', String(pinning));
            roster?.classList.toggle('is-pinning', pinning);
            if (pinHelp) pinHelp.hidden = !pinning;
            updatePinCards();
        });

        const toggleCardPin = (card: HTMLElement) => {
            const slug = card.dataset.characterSlug;
            if (!slug) return;
            // Merge any changes made in another tab before saving.
            try {
                if (localStorage.getItem(pinStorageKey) !== null) pins = readPins();
            } catch {
                // In-memory pinning still works if storage is blocked.
            }
            if (pins.has(slug)) pins.delete(slug);
            else pins.add(slug);
            try {
                localStorage.setItem(pinStorageKey, JSON.stringify([...pins]));
            } catch {
                // Pins remain usable for this visit.
            }
            updatePinCards();
            applyFilters();
            card.focus({ preventScroll: true });
        };

        roster?.addEventListener('click', (event) => {
            if (!pinning || !(event.target instanceof Element)) return;
            const card = event.target.closest<HTMLElement>('[data-character-card]');
            if (!card) return;
            event.preventDefault();
            event.stopPropagation();
            toggleCardPin(card);
        }, true);

        roster?.addEventListener('keydown', (event) => {
            if (!pinning || !['Enter', ' '].includes(event.key) ||
                !(event.target instanceof Element)) return;
            const card = event.target.closest<HTMLElement>('[data-character-card]');
            if (!card) return;
            event.preventDefault();
            if (!event.repeat) toggleCardPin(card);
        });

        window.addEventListener('storage', (event) => {
            if (event.key !== pinStorageKey && event.key !== null) return;
            pins = readPins();
            updatePinCards();
            applyFilters();
        });
    }

    form?.addEventListener('change', applyFilters);
    form?.addEventListener('input', applyFilters);
    form?.addEventListener('submit', (event) => event.preventDefault());
    if (sortSelect instanceof HTMLSelectElement) {
        sortSelect.addEventListener('change', applyFilters);
    }
    window.addEventListener('resize', updateVisibleImageLoading);
    applyFilters();
}



document
    .querySelector<HTMLElement>('[data-light-cone-browser]')
    ?.addEventListener('click', (event) => {
        const button =
            event.target instanceof Element
                ? event.target.closest<HTMLButtonElement>(
                    '[data-light-cone-superimposition]',
                )
                : null;

        const superimposition =
            button?.dataset.lightConeSuperimposition;

        const card = button?.closest<HTMLElement>(
            '[data-light-cone-card]',
        );

        if (!button || !superimposition || !card) {
            return;
        }

        card
            .querySelectorAll<HTMLElement>(
                '[data-light-cone-superimposition]',
            )
            .forEach((item) => {
                item.setAttribute(
                    'aria-pressed',
                    String(
                        item.dataset.lightConeSuperimposition ===
                        superimposition,
                    ),
                );
            });

        card
            .querySelectorAll<HTMLElement>(
                '[data-light-cone-superimposition-panel]',
            )
            .forEach((panel) => {
                panel.hidden =
                    panel.dataset
                        .lightConeSuperimpositionPanel !==
                    superimposition;
            });
    });