// GitHub Pages shares an origin with other projects. Never clear the origin.
export function resetCharacter(local = globalThis.localStorage, session = globalThis.sessionStorage) {
    for (const storage of [local, session]) {
        const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
            .filter(key => /^wyrmforge(?:[._-]|$)/i.test(key));
        for (const key of keys) storage.removeItem(key);
    }
}
export function openResetDialog(dialog) {
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('.cancel-reset')?.focus();
}
export function closeResetDialog(dialog) { dialog.close(); }
