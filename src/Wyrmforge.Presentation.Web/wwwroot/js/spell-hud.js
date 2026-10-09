const shapes = {
    'Arcane Orb': ['#c497ff', 'M12 2 22 12 12 22 2 12Z M12 7 17 12 12 17 7 12Z'],
    'Aether Dart': ['#c497ff', 'M3 21 11 4 20 3 19 12Z M3 21 14 10'],
    'Fire Bolt': ['#ff8755', 'M12 2C15 8 22 10 20 17C18 24 5 23 4 16C3 11 8 8 8 5L10 12Z'],
    'Cinder Needle': ['#ff8755', 'M4 20 16 3 21 3 21 8Z M3 10 7 8 M11 22 14 18'],
    'Frost Shard': ['#9fe5ff', 'M12 2V22 M3 7 21 17 M3 17 21 7 M8 4 12 7 16 4 M8 20 12 17 16 20'],
    'Ice Lance': ['#9fe5ff', 'M12 2 17 12 12 22 7 12Z M12 2V22'],
    'Chain Lightning': ['#ffe765', 'M14 2 5 13 11 13 9 22 20 9 13 9Z'],
    'Ball Lightning': ['#ffe765', 'M15 3 9 11 15 11 9 21 M5 5C0 12 3 21 10 23 M19 19C24 12 21 3 14 1']
};
export function spellVisual(name) { return shapes[name] ?? shapes['Arcane Orb']; }
export function createSpellBadge(spell) {
    const badge = document.createElement('span');
    badge.className = 'combat-spell-badge';
    badge.title = spell.evolutionName ?? spell.name;
    badge.setAttribute('aria-label', `${badge.title}, rank ${spell.rank}`);
    const [color, path] = spellVisual(spell.name);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('aria-hidden', 'true');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    for (const [key, value] of Object.entries({ d:path, fill:'none', stroke:color, 'stroke-width':'1.8', 'stroke-linecap':'round', 'stroke-linejoin':'round' })) line.setAttribute(key, value);
    svg.append(line);
    const rank = document.createElement('b');
    rank.textContent = ['0', 'I', 'II', 'III', 'IV', 'V'][spell.rank] ?? String(spell.rank);
    badge.append(svg, rank);
    if (spell.evolutionName) badge.classList.add('combat-spell-evolved');
    return badge;
}
