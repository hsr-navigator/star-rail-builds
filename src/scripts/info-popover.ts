const card = document.createElement('span');
card.className = 'info-popover-card';
card.id = 'info-popover-card';
card.setAttribute('popover', 'auto');
card.setAttribute('role', 'dialog');
document.body.append(card);

let activePopover: HTMLElement | null = null;
let pinned = false;
let pointerX: number | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let pointerEnableTimer: ReturnType<typeof setTimeout> | undefined;
const getPopover = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    if (card.contains(target)) return null;

    const direct = target.closest<HTMLElement>(
        '.info-popover[data-info-popover-html]',
    );
    if (direct) return direct;

    return (
        target
            .closest('.rank-row')
            ?.querySelector<HTMLElement>(
                '.weapon-popover[data-info-popover-html], ' +
                '.artifact-popover[data-info-popover-html]',
            ) ?? null
    );
};

const getHoverArea = (popover: HTMLElement) =>
    popover.closest<HTMLElement>('.rank-row') ?? popover;

function cancelHide() {
    clearTimeout(hideTimer);
    hideTimer = undefined;
}

function scheduleHide() {
    cancelHide();

    // Allow crossing the gap between the option and the popup.
    hideTimer = setTimeout(() => {
        if (!pinned) hidePopover();
    }, 40);
}

function positionCard(popover: HTMLElement) {
    const trigger = popover.querySelector<HTMLElement>(
        '.info-popover-trigger',
    );
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    const gap = 40;
    const verticalPosition = 0.1;
    const edge = 8;

    card.style.left = `${(pointerX ?? triggerRect.left) + gap}px`;
    card.style.top = `${Math.max(
        edge,
        Math.min(
            triggerRect.top +
            triggerRect.height / 2 -
            cardRect.height * verticalPosition,
            window.innerHeight - cardRect.height - edge,
        ),
    )}px`;
    // Briefly ignore the popup while it follows the cursor.
    // This lets quick sweeps reach the next option underneath.
    card.style.pointerEvents = 'none';

    clearTimeout(pointerEnableTimer);
    pointerEnableTimer = setTimeout(() => {
        card.style.pointerEvents = '';
    }, 60);
}

function showPopover(popover: HTMLElement, pin = false) {
    const html = popover.dataset.infoPopoverHtml;
    if (!html) return;

    cancelHide();

    // Pinning an already-open popup should not reset it or move it.
    if (activePopover === popover && card.matches(':popover-open')) {
        pinned = pinned || pin;
        return;
    }

    activePopover
        ?.querySelector<HTMLElement>('.info-popover-trigger')
        ?.setAttribute('aria-expanded', 'false');

    activePopover = popover;
    pinned = pin;

    card.className = [
        'info-popover-card',
        popover.dataset.infoPopoverCardClass ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    card.innerHTML = html;

    const trigger = popover.querySelector<HTMLElement>(
        '.info-popover-trigger',
    );
    trigger?.setAttribute('aria-controls', card.id);
    trigger?.setAttribute('aria-expanded', 'true');

    if (!card.matches(':popover-open')) {
        card.showPopover();
    }

    positionCard(popover);
}

function hidePopover() {
    cancelHide();

    activePopover
        ?.querySelector<HTMLElement>('.info-popover-trigger')
        ?.setAttribute('aria-expanded', 'false');

    activePopover = null;
    pinned = false;

    if (card.matches(':popover-open')) {
        card.hidePopover();
    }
}

function selectRefinement(button: HTMLElement) {
    const refinement = button.dataset.refinement;
    if (!refinement) return;

    card
        .querySelectorAll<HTMLElement>('[data-refinement]')
        .forEach((item) => {
            item.setAttribute(
                'aria-pressed',
                String(item === button),
            );
        });

    card
        .querySelectorAll<HTMLElement>('[data-refinement-panel]')
        .forEach((panel) => {
            panel.hidden =
                panel.dataset.refinementPanel !== refinement;
        });

    // Keep the popup at its current position.
}

function selectTraceLevel(slider: HTMLInputElement) {
    const level = slider.value;

    card
        .querySelectorAll<HTMLElement>('[data-trace-level-value]')
        .forEach((label) => {
            label.textContent = `Lv. ${level}`;
        });

    card
        .querySelectorAll<HTMLElement>('[data-trace-level-panel]')
        .forEach((panel) => {
            panel.hidden =
                panel.dataset.traceLevelPanel !== level;
        });

    // Keep the popup at its current position.
}

document.addEventListener('pointermove', (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;

    // Never follow the cursor while it is inside the popup.
    if (card.contains(target)) {
        cancelHide();
        return;
    }

    if (
        activePopover &&
        getHoverArea(activePopover).contains(target)
    ) {
        cancelHide();

        if (!pinned) {
            pointerX = event.clientX;
            positionCard(activePopover);
        }
    } else if (!activePopover) {
        pointerX = event.clientX;
    }
});

document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;

    if (
        event.target instanceof Node &&
        card.contains(event.target)
    ) {
        cancelHide();
        return;
    }

    const popover = getPopover(event.target);
    if (!popover) return;

    cancelHide();

    if (popover !== activePopover && !pinned) {
        pointerX = event.clientX;
        showPopover(popover);
    }
});

document.addEventListener('pointerout', (event) => {
    if (pinned || !activePopover) return;

    const next = event.relatedTarget;

    if (
        next instanceof Node &&
        (
            getHoverArea(activePopover).contains(next) ||
            card.contains(next)
        )
    ) {
        cancelHide();
        return;
    }

    scheduleHide();
});

card.addEventListener('input', (event) => {
    const target = event.target;

    if (
        target instanceof HTMLInputElement &&
        target.matches('[data-trace-level-slider]')
    ) {
        selectTraceLevel(target);
    }
});

card.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    // Pin the popup during interaction without moving it.
    if (
        target.closest(
            '[data-refinement], [data-trace-level-slider]',
        )
    ) {
        cancelHide();
        pinned = true;
    }
});

document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (card.contains(target)) {
        const refinement = target.closest<HTMLElement>(
            '[data-refinement]',
        );

        if (refinement) {
            event.preventDefault();
            event.stopPropagation();
            pinned = true;
            selectRefinement(refinement);
        }

        if (target.closest('.note-link')) {
            hidePopover();
        }

        return;
    }

    if (target.closest('.note-link')) {
        hidePopover();
        return;
    }

    // Leave other links and controls inside recommendation rows alone.
    if (
        target.closest('a, button, input, select, textarea') &&
        !target.closest('.info-popover-trigger')
    ) {
        return;
    }

    const popover = getPopover(target);
    if (!popover) return;

    event.preventDefault();

    if (activePopover === popover && pinned) {
        hidePopover();
    } else {
        pointerX = event.detail > 0 ? event.clientX : null;
        showPopover(popover, true);
    }
});

document.addEventListener('focusin', (event) => {
    if (
        event.target instanceof Node &&
        card.contains(event.target)
    ) {
        cancelHide();
        return;
    }

    const trigger =
        event.target instanceof Element
            ? event.target.closest('.info-popover-trigger')
            : null;

    const popover = getPopover(trigger);

    if (popover && !pinned) {
        pointerX = null;
        showPopover(popover);
    }
});

document.addEventListener('focusout', (event) => {
    if (pinned || !activePopover) return;

    const next = event.relatedTarget;

    if (
        next instanceof Node &&
        (
            getHoverArea(activePopover).contains(next) ||
            card.contains(next)
        )
    ) {
        return;
    }

    scheduleHide();
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const trigger =
        event.target instanceof Element
            ? event.target.closest<HTMLElement>(
                '.info-popover-trigger',
            )
            : null;

    const popover = getPopover(trigger);
    if (!popover || !trigger) return;

    // Native buttons and links already produce their own click events.
    if (trigger.matches('button, a[href], input')) return;

    event.preventDefault();

    if (event.repeat) return;

    if (activePopover === popover && pinned) {
        hidePopover();
    } else {
        pointerX = null;
        showPopover(popover, true);
    }
});

card.addEventListener('toggle', () => {
    if (!card.matches(':popover-open')) {
        cancelHide();

        activePopover
            ?.querySelector<HTMLElement>('.info-popover-trigger')
            ?.setAttribute('aria-expanded', 'false');

        activePopover = null;
        pinned = false;
    }
});

window.addEventListener('resize', () => {
    if (activePopover) {
        positionCard(activePopover);
    }
});