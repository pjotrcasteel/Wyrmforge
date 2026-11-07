import { openHunterSave, parseHunterSave } from './hunter-save.js';

const sdk = 'https://www.gstatic.com/firebasejs/13.2.0';
const maxSaveBytes = 600_000;
let connection;

export function connect(config) {
    connection ??= openFirebase(config).catch(error => {
        connection = null;
        throw error;
    });
    return connection.then(client => Boolean(client.auth.currentUser));
}

async function openFirebase(config) {
    const [app, authSdk, db] = await Promise.all([
        import(sdk + '/firebase-app.js'),
        import(sdk + '/firebase-auth.js'),
        import(sdk + '/firebase-firestore-lite.js'),
    ]);
    const firebase = app.getApps().find(item => item.name === 'hunter-backup') ?? app.initializeApp(config, 'hunter-backup');
    const auth = authSdk.getAuth(firebase);
    await auth.authStateReady();
    return { auth, authSdk, db, firestore: db.getFirestore(firebase), projectId: config.projectId };
}

export async function signIn() {
    const client = await connection;
    await client.authSdk.signInWithPopup(client.auth, new client.authSdk.GoogleAuthProvider());
}

export async function signOut() {
    const client = await connection;
    await client.authSdk.signOut(client.auth);
}

async function getBackup() {
    const client = await connection;
    const uid = client.auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in to access your backup.');
    return { ...client, uid, reference: client.db.doc(client.firestore, 'hunterBackups', uid) };
}

export function prepareUpload(local, remote, account, replaceBackup = null) {
    const revision = remote?.revision ?? 0;
    const base = local.cloud;
    const linked = base?.uid === account.uid && base?.projectId === account.projectId;
    const payload = JSON.stringify({ schemaVersion: local.schemaVersion, sections: local.sections });
    if (remote?.payload === payload) return { status: 'current', revision };
    if (Object.keys(local.sections).length === 0) return { status: 'empty' };
    const replacement = replaceBackup?.uid === account.uid && replaceBackup?.projectId === account.projectId
        && replaceBackup?.revision === revision;
    if (revision !== 0 && !(linked && base.revision === revision) && !replacement) {
        return { status: 'conflict', backup: { uid: account.uid, projectId: account.projectId, revision } };
    }
    if (new TextEncoder().encode(payload).length > maxSaveBytes) return { status: 'too-large' };
    return { status: 'upload', revision: revision + 1, payload };
}

function withCloud(save, client, revision) {
    return { ...save, cloud: { uid: client.uid, projectId: client.projectId, revision } };
}

export async function backup(saveKey, keys, replaceBackup) {
    const client = await getBackup();
    const localStore = openHunterSave(localStorage, saveKey, keys);
    const local = localStore.snapshot();
    const expected = JSON.stringify(local);

    const result = await client.db.runTransaction(client.firestore, async transaction => {
        const remote = (await transaction.get(client.reference)).data();
        const result = prepareUpload(local, remote, client, replaceBackup);
        if (result.status === 'upload') {
            transaction.set(client.reference, { revision: result.revision, payload: result.payload });
        }
        return result;
    });

    if (client.auth.currentUser?.uid !== client.uid) throw new Error('The signed-in account changed.');
    if (result.status === 'upload' || result.status === 'current') {
        const marked = localStore.replace(expected, withCloud(local, client, result.revision));
        return { status: marked ? 'saved' : 'local-changed' };
    }
    return result;
}

export async function restore(saveKey, keys) {
    const client = await getBackup();
    const localStore = openHunterSave(localStorage, saveKey, keys);
    const local = localStore.snapshot();
    const expected = JSON.stringify(local);
    const remote = (await client.db.getDoc(client.reference)).data();
    if (client.auth.currentUser?.uid !== client.uid) throw new Error('The signed-in account changed.');
    if (!remote) return 'missing';

    const save = parseHunterSave(remote.payload);
    if (!Number.isSafeInteger(remote.revision) || remote.revision < 1) throw new Error('Invalid backup revision.');
    if (Object.keys(local.sections).length > 0 && !globalThis.confirm('Replace the Hunter on this device with your cloud backup?')) {
        return 'cancelled';
    }
    if (!localStore.replace(expected, withCloud(save, client, remote.revision))) return 'local-changed';
    return 'restored';
}
