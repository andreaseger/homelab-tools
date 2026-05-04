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

const deviceId = process.env.MATTER_DEVICE_ID ?? 'kindle1';
const pageTabs = (process.env.MATTER_PAGE_TABS ?? 'overview,lights').split(',');

export function register(plugin: MatterbridgePlugin) {
  plugin.log('Registering Kindle Dashboard Matter plugin');

  plugin.registerDevice(deviceId, `Kindle Dashboard`);

  plugin.onIdentify(deviceId, () => {
    plugin.log(`Identify requested for ${deviceId}`);
  });

  plugin.setOnOffHandler(deviceId, async (on: boolean) => {
    const paused = !on;
    plugin.log(`${deviceId} set paused=${paused}`);
    const ok = await fetch(`${process.env.KINDLE_DASH_URL ?? 'http://127.0.0.1:8080'}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DASHBOARD_TOKEN ?? ''}`,
      },
      body: JSON.stringify({ device: deviceId, kind: 'set_paused', value: paused ? 1 : 0 }),
    })
      .then((r) => r.ok)
      .catch(() => false);
    if (!ok) {
      plugin.log(`Failed to set paused for ${deviceId}`);
    }
  });

  plugin.setLevelControlHandler(deviceId, async (level: number) => {
    plugin.log(`${deviceId} backlight=${level}%`);
    const ok = await handleBacklightChange(deviceId, level);
    if (!ok) {
      plugin.log(`Failed to set backlight for ${deviceId}`);
    }
  });

  for (let i = 0; i < pageTabs.length; i++) {
    const pageId = pageTabs[i]!;
    plugin.setGenericSwitchHandler(
      `${deviceId}-page-${i}`,
      async (_switchIndex: number, action: boolean) => {
        if (action) {
          plugin.log(`${deviceId} switch to page ${pageId}`);
          const ok = await handlePageSwitch(deviceId, pageId);
          if (!ok) {
            plugin.log(`Failed to switch to page ${pageId}`);
          }
        }
      }
    );
  }

  startStatePoll((attrs) => {
    plugin.log(`${deviceId} state: page=${attrs.currentPage}, paused=${!attrs.onOff}`);
  });

  return () => {
    stopStatePoll();
    plugin.log('Kindle Dashboard Matter plugin stopped');
  };
}
