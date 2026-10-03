const bestScoreKey = 'wyrmforge.bestScore';

export function getBestScore() {
    return Number(localStorage.getItem(bestScoreKey) ?? 0);
}

export function setBestScore(value) {
    localStorage.setItem(bestScoreKey, String(value));
}
