// Keep the existing domain payloads so each domain can migrate independently.
export function openHunterSave(storage, saveKey, keys) {
    const allowed = new Set(keys);
    function load() {
        const raw = storage.getItem(saveKey);
        if (raw !== null) {
            const save = JSON.parse(raw);
            if (save.schemaVersion !== 1 || !save.sections || typeof save.sections !== 'object' || Array.isArray(save.sections)) {
                throw new Error('Unsupported Hunter save.');
            }
            return save;
        }

        const sections = Object.create(null);
        for (const key of allowed) {
            const value = storage.getItem(key);
            if (value !== null) sections[key] = value;
        }
        return { schemaVersion: 1, sections };
    }

    return {
        read(key) {
            const sections = load().sections;
            return allowed.has(key) && typeof sections[key] === 'string' ? sections[key] : null;
        },
        write(changes) {
            const save = load();
            for (const [key, value] of Object.entries(changes)) {
                if (!allowed.has(key) || typeof value !== 'string') throw new Error('Invalid Hunter save section.');
                save.sections[key] = value;
            }
            storage.setItem(saveKey, JSON.stringify(save));
        },
    };
}

export function read(saveKey, keys, key) {
    return openHunterSave(localStorage, saveKey, keys).read(key);
}

export function write(saveKey, keys, changes) {
    openHunterSave(localStorage, saveKey, keys).write(changes);
}
