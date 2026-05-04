import type { PageConfig } from '../shared/types';

export const pages: PageConfig[] = [
  {
    id: 'overview',
    title: 'Overview',
    layout: [
      {
        widget: 'clock',
        bbox: { x: 16, y: 16, w: 400, h: 80 },
        config: { format: '24h', showDate: true },
      },
      {
        widget: 'page-tabs',
        bbox: { x: 16, y: 104, w: 1040, h: 56 },
        config: {
          pages: [
            { id: 'overview', label: 'Overview' },
            { id: 'lights', label: 'Lights' },
          ],
        },
      },
    ],
  },
  {
    id: 'lights',
    title: 'Lights',
    layout: [
      {
        widget: 'page-tabs',
        bbox: { x: 16, y: 16, w: 1040, h: 56 },
        config: {
          pages: [
            { id: 'overview', label: 'Overview' },
            { id: 'lights', label: 'Lights' },
          ],
        },
      },
    ],
  },
];
