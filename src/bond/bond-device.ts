import { Action } from "./action";
import { DeviceType } from "./device-type";

export interface BondDevice {
    id: string;
    name: string;
    type: DeviceType;
    location: string;
    actions: Action[];
}

export namespace BondDevice {
    export function displayName(device: BondDevice): string {
      return `${device.location} ${device.name}`;
    }
  
    export function isSupported(device: BondDevice): boolean {
      const supported = [DeviceType.Shades];
      return supported.includes(device.type);
    }
  
    export function hasOpenClose(device: BondDevice): boolean {
      const actions = [Action.TurnOff, Action.TurnOn];
      return actions.every(a => device.actions.includes(a));
    }
  
    export function hasToggleOpen(device: BondDevice): boolean {
      const required = [Action.ToggleOpen];
      return device.actions.some(a => required.includes(a));
    }
}