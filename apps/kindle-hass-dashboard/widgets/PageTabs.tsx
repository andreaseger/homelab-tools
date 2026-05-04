import type { WidgetSpec, Action } from '../shared/types';

interface PageTabEntry {
  id: string;
  label: string;
}

interface PageTabsConfig {
  pages: PageTabEntry[];
}

export const PageTabsWidget: WidgetSpec<PageTabsConfig> = {
  id: 'page-tabs',
  entities: () => [],
  render: (config, ctx) => {
    const tabWidth = Math.floor(ctx.device.width / config.pages.length);

    const tabs = config.pages.map((page, i) => {
      const isActive = page.id === ctx.page.id;
      const action: Action = { kind: 'navigate', pageId: page.id };

      ctx.registerHotZone(
        { x: i * tabWidth, y: 0, w: tabWidth, h: 56 },
        action,
        `navigate:${page.id}`
      );

      return (
        <div
          key={page.id}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 24px',
            fontSize: 20,
            color: isActive ? '#101010' : '#404040',
            backgroundColor: isActive ? '#ffffff' : '#e0e0e0',
            fontWeight: isActive ? 'bold' : 'normal',
            borderRight: i < config.pages.length - 1 ? '1px solid #a0a0a0' : 'none',
          }}
        >
          {page.label}
        </div>
      );
    });

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          border: '2px solid #808080',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {tabs}
      </div>
    );
  },
};
