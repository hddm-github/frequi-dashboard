export interface BotPreset {
  id: string;
  name: string;
  apiUrl: string;
  description: string;
}

export const PRESET_BOTS: BotPreset[] = [
  {
    id: 'futures',
    name: 'FuturesBinance-Bot',
    apiUrl: '/ft-api',
    description: 'Futures Bot (/ft-api)',
  },
  {
    id: 'custom',
    name: 'Custom Bot...',
    apiUrl: '',
    description: 'Manual bot name & URL',
  },
];
