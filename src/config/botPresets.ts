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
    name: 'freqtrade-bot',
    nameZh: 'Freqtrade 机器人',
    apiUrl: '/',
    description: 'This server (standard /api/v1)',
    descriptionZh: '本服务器（标准 /api/v1）',
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
