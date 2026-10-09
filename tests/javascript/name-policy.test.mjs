import test from 'node:test';
import assert from 'node:assert/strict';
import { validateName } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/name-policy.js';
test('English and Dutch profanity, common digit substitutions and separators are rejected', () => {
    for (const name of ['FuckMage','KutHunter','NaziMage','f_u_c_k','Sh1t','f4gg0t','KankerMage','kut','h-o-e-r','NAZI','b1tch']) assert.ok(validateName(name), name);
});
test('ordinary nicknames and words containing harmless short sequences remain valid', () => {
    for (const name of ['Pjotr','Class Mage','Assassin','Scunthorpe','Knight','Fire-01','Frost Hunter']) assert.equal(validateName(name), null, name);
    for (const name of ['A','<script>','TooLongNickname123456']) assert.ok(validateName(name));
});
