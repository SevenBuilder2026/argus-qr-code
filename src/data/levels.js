export const LEVELS = [
  { level: 0, name: 'Civilian',      minXp: 0,   maxXp: 4   },
  { level: 1, name: 'Scout',         minXp: 5,   maxXp: 14  },
  { level: 2, name: 'Tracker',       minXp: 15,  maxXp: 29  },
  { level: 3, name: 'Sentinel',      minXp: 30,  maxXp: 59  },
  { level: 4, name: 'Warden',        minXp: 60,  maxXp: 99  },
  { level: 5, name: 'Investigator',  minXp: 100, maxXp: 149 },
  { level: 6, name: 'Inspector',     minXp: 150, maxXp: 224 },
  { level: 7, name: 'Guardian',      minXp: 225, maxXp: 324 },
  { level: 8, name: 'Argus Elite',   minXp: 325, maxXp: 499 },
  { level: 9, name: 'Argus Master',  minXp: 500, maxXp: Infinity },
];

export function getCurrentLevel(xpTotal) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xpTotal >= l.minXp) current = l;
    else break;
  }
  const nextLevel = current.level < LEVELS.length - 1 ? LEVELS[current.level + 1] : null;
  const nextLevelXp = nextLevel ? nextLevel.minXp : null;
  const progress = nextLevel
    ? (xpTotal - current.minXp) / (nextLevel.minXp - current.minXp)
    : 1.0;
  return { level: current.level, name: current.name, nextLevelXp, progress };
}
