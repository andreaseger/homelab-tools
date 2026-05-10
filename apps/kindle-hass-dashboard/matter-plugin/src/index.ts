import {
  startStatePoll,
  stopStatePoll,
  handleBacklightChange,
  handlePageSwitch,
} from './cluster-mapping';

interface MatterbridgePlugin {
  log: (msg: string) => void;
  registerDevice: (id: string, name: string) => void;
  onIdentify: (id: string, cb: () => void) => void;
  setOnOffHandler: (id: string, cb: (on: boolean) => void) => void;
  setLevelControlHandler: (id: string, cb: (level: number) => void) => void;
  setGenericSwitchHandler: (id: string, cb: (switchIndex: number, action: boolean) => void) => void;
}

const matterId = process.env.MATTER_DEVICE_ID ?? 'kindle';
const pageTabs = (process.env.MATTER_PAGE_TABS ?? 'overview,lights').split(',');

export function register(plugin: MatterbridgePlugin) {
  plugin.log('Registering Kindle Dashboard Matter plugin');

  plugin.registerDevice(matterId, `Kindle Dashboard`);

  plugin.onIdentify(matterId, () => {
    plugin.log(`Identify requested for ${matterId}`);
  });

  plugin.setOnOffHandler(matterId, async (on: boolean) => {
    const paused = !on;
    plugin.log(`set paused=${paused}`);
    const ok = await fetch(`${process.env.KINDLE_DASH_URL ?? 'http://127.0.0.1:8080'}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DASHBOARD_TOKEN ?? ''}`,
      },
      body: JSON.stringify({ kind: 'set_paused', value: paused ? 1 : 0 }),
    })
      .then((r) => r.ok)
      .catch(() => false);
    if (!ok) {
      plugin.log(`Failed to set paused`);
    }
  });

  plugin.setLevelControlHandler(matterId, async (level: number) => {
    plugin.log(`backlight=${level}%`);
    const ok = await handleBacklightChange(level);
    if (!ok) {
      plugin.log(`Failed to set backlight`);
    }
  });

  for (let i = 0; i < pageTabs.length; i++) {
    const pageId = pageTabs[i]!;
    plugin.setGenericSwitchHandler(
      `${matterId}-page-${i}`,
      async (_switchIndex: number, action: boolean) => {
        if (action) {
          plugin.log(`switch to page ${pageId}`);
          const ok = await handlePageSwitch(pageId);
          if (!ok) {
            plugin.log(`Failed to switch to page ${pageId}`);
          }
        }
      }
    );
  }

  startStatePoll((attrs) => {
    plugin.log(`state: page=${attrs.currentPage}, paused=${!attrs.onOff}`);
  });

  return () => {
    stopStatePoll();
    plugin.log('Kindle Dashboard Matter plugin stopped');
  };
}
