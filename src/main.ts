import sdk, { ScryptedDeviceBase, DeviceProvider, Settings, Setting, Device, ScryptedDeviceType, ScryptedInterface, Entry, Refresh, EntrySensor } from '@scrypted/sdk';
import { BondApi } from './bond/bond-api'
import { BondDevice } from './bond/bond-device'

const { deviceManager } = sdk;

class BondShade extends ScryptedDeviceBase implements Entry, EntrySensor, Refresh {
  bondDevice: BondDevice;
  provider: BondController;

  constructor(bondDevice: BondDevice, provider: BondController) {
    super(bondDevice.id);
    this.bondDevice = bondDevice;
    this.provider = provider;

    setImmediate(() => this.refresh("constructor", false));
  }

  async getRefreshFrequency(): Promise<number> {
    return 15;
  }

  async refresh(refreshInterface: string, userInitiated: boolean): Promise<void> {
    const state = await this.provider.api.getState(this.bondDevice.id);
    this.entryOpen = state.open == 1
  }
  
  async closeEntry(): Promise<void> {
    if (!BondDevice.hasToggleOpen) {
      this.console.error(`[${this.name}] (${new Date().toLocaleString()}) Device with id ${this.bondDevice.id} does not have required ToggleOpen action.`);
      return
    }
    await this.provider.api.toggleOpen(this.bondDevice);
    this.entryOpen = false
  }
  
  async openEntry(): Promise<void> {
    if (!BondDevice.hasToggleOpen) {
      this.console.error(`[${this.name}] (${new Date().toLocaleString()}) Device with id ${this.bondDevice.id} does not have required ToggleOpen action.`);
      return
    }
    await this.provider.api.toggleOpen(this.bondDevice);
    this.entryOpen = true
  }
}

class BondController extends ScryptedDeviceBase implements DeviceProvider, Settings {
  devices = new Map<string, BondShade>();
  api: BondApi;

  constructor() {
    super();
    this.log.clearAlerts();
    this.initialize();
  }

  async initialize(): Promise<void> {
    // If no clientId, request clientId to start authentication process
    if (!this.storage.getItem("ip_address") || !this.storage.getItem("token")) {
      this.log.a("Please set the IP Address and Token of the Bond Bridge.");
      this.console.log(`[${this.name}] (${new Date().toLocaleString()}) Please set the IP Address and Token of the Bond Bridge. Reload the plugin to continue...`);
      return;
    }

    this.api = new BondApi(this.storage.getItem("ip_address"), this.storage.getItem("token"));
    this.discoverDevices();
  }


  async getSettings(): Promise<Setting[]> {
    return [
      {
        title: 'IP Address',
        key: 'ip_address',
        description: "IP Address of the Bond Bridge",
        value: localStorage.getItem('ip_address'),
      },
      {
        title: 'Token',
        type: 'password',
        key: 'token',
        description: "Local Token of the Bond Bridge",
        value: localStorage.getItem('token'),
      }
    ];
  }

  async putSetting(key: string, value: string | number | boolean) {
    localStorage.setItem(key, value.toString());
  }

  async getDevice(nativeId: string) {
    return this.devices.get(nativeId);
  }

  async releaseDevice(id: string, nativeId: string) {
    this.console.info(`[${this.name}] (${new Date().toLocaleString()}) Device with id '${nativeId}' was removed.`);
  }

  async discoverDevices() {
    this.console.info(`[${this.name}] (${new Date().toLocaleString()}) Discovering devices...`);
    const bondVersion = await this.api.getVersion();
    const deviceIds = await this.api.getDeviceIds();
    const bondDevices = (await this.api.getDevices(deviceIds)).filter(device => {
      // Filter out unsupported devices
      if (BondDevice.isSupported(device)) {
        return device
      }
    });

    const devices: Device[] = [];
    for (let bondDevice of bondDevices) {
      const device: Device = {
        nativeId: bondDevice.id,
        name: bondDevice.name,
        type: ScryptedDeviceType.WindowCovering,
        info: {
          model: bondVersion.model,
          manufacturer: bondVersion.make ?? `Bond (${bondVersion.target})`,
          firmware: bondVersion.fw_ver.replace('v',''),
          serialNumber: bondDevice.id
        },
        interfaces: [ScryptedInterface.Entry, ScryptedInterface.EntrySensor, ScryptedInterface.Refresh],
      }
      devices.push(device);
      this.console.info(`[${this.name}] (${new Date().toLocaleString()}) Discovered device with id '${bondDevice.id}'.`);
    }
    
    await deviceManager.onDevicesChanged({
      devices,
    });

    for (let device of devices) {
      let providedDevice = this.devices.get(device.nativeId);
      if (!providedDevice) {
        const bondDevice = bondDevices.find(x => x.id == device.nativeId)
        providedDevice = new BondShade(bondDevice, this)
        this.devices.set(device.nativeId, providedDevice)
      }
    }
  }

}

export default new BondController();
