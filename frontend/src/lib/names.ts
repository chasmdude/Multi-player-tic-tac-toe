const adjectives = [
  'Swift', 'Brave', 'Cunning', 'Mystic', 'Silent', 'Golden', 'Iron', 'Frost', 'Storm', 'Shadow',
  'Wild', 'Ancient', 'Lucky', 'Noble', 'Prism', 'Radiant', 'Savage', 'Vortex', 'Zen', 'Thunder'
];

const nouns = [
  'Tiger', 'Falcon', 'Wolf', 'Dragon', 'Phoenix', 'Knight', 'Wizard', 'Shadow', 'Storm', 'Hunter',
  'Titan', 'Rogue', 'Ghost', 'Blade', 'Raven', 'Eagle', 'Panda', 'Serpent', 'Lion', 'Slayer'
];

export function generateRandomName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${adj}${noun}${num}`;
}
