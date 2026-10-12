export interface BotPreset {
  id: string;
  name: string;
  nameZh: string;
  apiUrl: string;
  description: string;
  descriptionZh: string;
}

export const PRESET_BOTS: BotPreset[] = [
  {
    id: 'futures',
    name: 'Binance Futures Bot',
    nameZh: '币安合约机器人',
    apiUrl: '/ft-api',
    description: 'Futures Bot (/ft-api)',
    descriptionZh: '合约机器人 (/ft-api)',
  },
  {
    id: 'custom',
    name: 'Custom Bot...',
    nameZh: '自定义机器人...',
    apiUrl: '',
    description: 'Manual bot name & URL',
    descriptionZh: '自定义机器人名称与地址',
  },
];

export function getPresetDisplayName(preset: BotPreset, locale: 'zh' | 'en'): string {
  return locale === 'zh' ? preset.nameZh : preset.name;
}
