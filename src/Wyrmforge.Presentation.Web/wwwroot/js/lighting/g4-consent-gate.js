// Only the isolated G4 Pages test URL loads this module. No normal-game consent UI.
export const G4_SHARING_KEY = 'wyrmforge.g4.autoSendConsent.v1';

/**
 * One simple choice BEFORE Blazor creates any Gate/Town/Hunt menus.
 * No hidden panel and no automatic upload; both buttons are explicit.
 */
export function showG4PreflightChoice({
    doc = document,
    storage = localStorage,
} = {}) {
    if (doc.querySelector('[data-g4-preflight]')) {
        throw new Error('G4 sharing preflight is already mounted');
    }
    return new Promise(resolve => {
        const overlay = doc.createElement('div');
        overlay.setAttribute('data-g4-preflight', '');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'G4 performance testing: choose how results are saved');
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0', zIndex: '2147483647',
            display: 'grid', placeItems: 'center',
            padding: 'max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))',
            background: '#100e15', color: '#f8f0e7',
            font: '16px/1.5 system-ui,sans-serif', boxSizing: 'border-box'
        });
        const card = doc.createElement('section');
        Object.assign(card.style, { width: 'min(100%, 420px)', display: 'grid', gap: '16px',
            padding: '24px', border: '1px solid #9b7853', borderRadius: '14px',
            background: '#201925', boxSizing: 'border-box' });
        const heading = doc.createElement('h1');
        heading.textContent = 'G4 PHONE TEST';
        Object.assign(heading.style, { margin: '0', fontSize: 'clamp(22px, 6vw, 28px)', letterSpacing: '.04em' });
        const explanation = doc.createElement('p');
        explanation.textContent = 'Play normally. Performance is recorded automatically, even if you die. Choose where the results go.';
        explanation.style.margin = '0';
        const status = doc.createElement('p');
        status.setAttribute('data-g4-preflight-status', '');
        Object.assign(status.style, { margin: '0', color: '#cbbba9', fontSize: '13px' });
        status.textContent = 'Sharing is optional. No device ID, location or movement history is sent.';
        const choose = (label, value, primary) => {
            const button = doc.createElement('button');
            button.type = 'button';
            button.setAttribute('data-g4-choice', value);
            button.textContent = label;
            Object.assign(button.style, {
                display: 'block', width: '100%', minHeight: '54px',
                padding: '12px 18px', borderRadius: '8px',
                border: '1px solid #b89665', fontSize: '16px', fontWeight: '700',
                background: primary ? '#d6a669' : '#382d3b',
                color: primary ? '#201622' : '#fff', cursor: 'pointer'
            });
            button.addEventListener('click', () => {
                try {
                    storage.setItem(G4_SHARING_KEY, value);
                    // The choice must be retained; do not falsely report upload consent.
                    if (storage.getItem(G4_SHARING_KEY) !== value) throw new Error('storage unavailable');
                } catch {
                    if (value === 'yes') {
                        status.textContent = 'Sharing cannot be enabled in this browser. Choose Keep private to play without uploading.';
                        return;
                    }
                }
                overlay.remove();
                resolve(value);
            });
            card.appendChild(button);
            return button;
        };
        card.append(heading, explanation);
        const share = choose('Share performance results privately', 'yes', true);
        choose('Keep private on this phone', 'no', false);
        card.appendChild(status);
        overlay.appendChild(card);
        doc.body.appendChild(overlay);
        share.focus();
    });
}
