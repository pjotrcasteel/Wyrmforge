// Shared by the nickname editor and public score intake. Keep ordinary words such as "class" valid.
const words = new Set(['fuck','fucker','fucking','motherfucker','shit','shitty','bullshit','bitch','bitches','cunt','asshole','faggot','nigger','nigga','nazi',
    'kanker','kut','lul','hoer','neuken','pik','tering','tyfus','godverdomme']);
const embedded = ['fuck','bitch','asshole','faggot','nigger','nigga','kanker','godverdomme'];
export function validateName(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9 _-]{2,18}$/.test(value.trim())) return 'Use 2–18 letters, numbers, spaces, _ or -.';
    const normalized = value.trim().replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().replace(/[013457]/g, digit => ({0:'o',1:'i',3:'e',4:'a',5:'s',7:'t'})[digit]);
    const tokens = normalized.split(/[ _-]+/);
    const joined = tokens.join('');
    if (tokens.some(word => words.has(word)) || words.has(joined) || embedded.some(word => joined.includes(word))) return 'Choose a different name.';
    return null;
}
