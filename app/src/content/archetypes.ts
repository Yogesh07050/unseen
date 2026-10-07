import type { ArchetypeId, Struggle } from '../types';

export interface Archetype { id: ArchetypeId; name: string; struggles: Struggle[]; look: string; tint: number }

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  ember: { id: 'ember', name: 'The Ember', struggles: ['anger'], look: 'Smouldering smoke with ember cracks', tint: 0 },
  whisperer: { id: 'whisperer', name: 'The Whisperer', struggles: ['fear'], look: 'Grey-violet wisps that circle and murmur', tint: 220 },
  serpent: { id: 'serpent', name: 'The Serpent', struggles: ['sexual'], look: 'A coil of shadow, never sexualised', tint: 120 },
  fog: { id: 'fog', name: 'The Fog', struggles: ['escapism'], look: 'A haze that dims the screen', tint: 200 },
  accuser: { id: 'accuser', name: 'The Accuser', struggles: ['shame'], look: 'Carries a ledger that is nailed to the cross', tint: 300 },
  mirror: { id: 'mirror', name: 'The Mirror', struggles: ['envy'], look: 'A cracked mirror-shade', tint: 180 },
  chain: { id: 'chain', name: 'The Chain', struggles: ['compulsion'], look: 'Shadow links that snap', tint: 30 },
  mask: { id: 'mask', name: 'The Mask', struggles: ['deceit'], look: 'A smiling mask over smoke', tint: 260 },
  crown: { id: 'crown', name: 'The Crown', struggles: ['pride'], look: 'A tall shade in a tarnished crown', tint: 45 },
  shadow: { id: 'shadow', name: 'The Tempter', struggles: ['other'], look: 'A plain shadow', tint: 0 },
};

const STRUGGLE_TO_ARCHETYPE: Record<string, ArchetypeId> = {
  anger: 'ember', fear: 'whisperer', sexual: 'serpent', escapism: 'fog', shame: 'accuser',
  envy: 'mirror', compulsion: 'chain', deceit: 'mask', pride: 'crown', other: 'shadow',
};

export function archetypeFor(struggle: Struggle): ArchetypeId {
  return STRUGGLE_TO_ARCHETYPE[struggle] ?? 'shadow';
}
