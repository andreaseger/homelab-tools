import { startStatePoll, stopStatePoll, handleBacklightChange } from './cluster-mapping';

interface MatterbridgePlugin {
  log: (msg: string) => void;
  registerDevice: (id: string, name: string) => void;
  onIdentify: (id: string, cb: () => void) => void;
  setOnOffHandler: (id: string, cb: (on: boolean) => void) => void;
  setLevelControlHandler: (id: string, cb: (level: number) => void) => void;
}

const deviceId = process.env.MATTER_DEVICE_ID ?? 'kindle1';

export function register(plugin: MatterbridgePlugin) {
  plugin.log('Registering Kindle Dashboard Matter plugin');

  plugin.registerDevice(deviceId, `Kindle Dashboard`);

  plugin.onIdentify(deviceId, () => {
    plugin.log(`Identify requested for ${deviceId}`);
  });

  plugin.setOnOffHandler(deviceId, async (on: boolean) => {
    plugin.log(`${deviceId} paused=${!on}`);
  });

  plugin.setLevelControlHandler(deviceId, async (level: number) => {
    plugin.log(`${deviceId} backlight=${level}%`);
    const ok = await handleBacklightChange(deviceId, level);
    if (!ok) {
      plugin.log(`Failed to set backlight for ${deviceId}`);
    }
  });

  startStatePoll((attrs) => {
    plugin.log(`${deviceId} state: page=${attrs.currentPage}, paused=${!attrs.onOff}`);
  });

  return () => {
    stopStatePoll();
    plugin.log('Kindle Dashboard Matter plugin stopped');
  };
}
