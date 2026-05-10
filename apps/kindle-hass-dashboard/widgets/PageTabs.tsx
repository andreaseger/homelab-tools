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
    const tabWidth = Math.floor(ctx.bbox.w / config.pages.length);

    const tabs = config.pages.map((page, i) => {
      const isActive = page.id === ctx.page.id;
      const action: Action = { kind: 'navigate', pageId: page.id };
      ctx.registerHotZone(
        { x: i * tabWidth, y: 0, w: tabWidth, h: ctx.bbox.h },
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
            fontSize: 28,
            fontWeight: isActive ? 700 : 500,
            color: isActive ? '#fafaf6' : '#202020',
            backgroundColor: isActive ? '#101010' : '#e8e4d8',
            borderRight: i < config.pages.length - 1 ? '2px solid #303030' : 'none',
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
          width: '100%',
          height: '100%',
          border: '2px solid #303030',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {tabs}
      </div>
    );
  },
};
