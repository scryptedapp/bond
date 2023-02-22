import { Action } from "./action";

export class BondUri {
  private ip: string;

  constructor(ip: string) {
    this.ip = ip;
  }

  public version(): string {
    return `http://${this.ip}/v2/sys/version`;
  }

  public deviceIds(): string {
    return `http://${this.ip}/v2/devices`;
  }

  public device(id: string): string {
    return `http://${this.ip}/v2/devices/${id}`;
  }

  public state(id: string): string {
    return `http://${this.ip}/v2/devices/${id}/state`;
  }
  
  public action(id: string, action: Action): string {
    return `http://${this.ip}/v2/devices/${id}/actions/${action}`;
  }

  public commands(id: string): string {
    return `http://${this.ip}/v2/devices/${id}/commands`;
  }

  public command(deviceId: string, commandId: string): string {
    return `http://${this.ip}/v2/devices/${deviceId}/commands/${commandId}`;
  }

  public properties(id: string): string {
    return `http://${this.ip}/v2/devices/${id}/properties`;
  }
}