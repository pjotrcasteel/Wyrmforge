// Focus once on entry/advancement; selecting a landmark never steals manual scroll.
export function focusHunter(viewport, advance = false) {
    const marker = viewport.querySelector('[data-current="true"]');
    if (!marker) return;
    const choices = [...viewport.querySelectorAll('.route-node.available')];
    const hunterTop = marker.offsetTop - viewport.clientHeight * 0.78;
    const choicesTop = choices.length ? Math.min(...choices.map(node => node.offsetTop)) - 70 : hunterTop;
    const top = Math.max(0, Math.min(viewport.scrollHeight - viewport.clientHeight, hunterTop, choicesTop));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (advance && !reducedMotion) {
        viewport.scrollTop = Math.min(viewport.scrollHeight - viewport.clientHeight, top + 160);
        viewport.scrollTo({ top, behavior: 'smooth' });
    } else {
        viewport.scrollTo({ top, behavior: 'instant' });
    }
}
