import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";
import { randomUUID } from "crypto";
import { Action } from "./action";
import { BondUri } from "./bond-uri";
import { BondState } from "./bond-state";
import { Version } from "./version";
import { BondDevice } from "./bond-device";

enum HTTPMethod {
  GET = 'get',
  PUT = 'put',
  PATCH = 'patch'
}
  
export class BondApi {
  private bondToken: string;
  private uri: BondUri;

  constructor(ipAddress: string, token: string) {
    this.bondToken = token;
    this.uri = new BondUri(ipAddress);

    axiosRetry(axios, { retries: 10, retryDelay: axiosRetry.exponentialDelay });
  }

  // Bond / Device Info

  public getVersion(): Promise<Version> {
    return this.request(HTTPMethod.GET, this.uri.version());
  }

  public getState(id: string): Promise<BondState> {
    return this.request(HTTPMethod.GET, this.uri.state(id));
  }

  public getDeviceIds(): Promise<string[]> {
    const req = this.request(HTTPMethod.GET, this.uri.deviceIds());
    return req.then(json =>
      Object.keys(json).filter(x => {
        // Ignore anything that is an empty string or starts with underscores
        return x.length > 0 && !/^_+/.test(x);
      }),
    );
  }

  public getDevices(ids: string[]): Promise<BondDevice[]> {
    const ps: Promise<BondDevice>[] = [];
    ids.forEach(id => {
      ps.push(this.getDevice(id));
    });
    return Promise.all(ps);
  }

  private getDevice(id: string): Promise<BondDevice> {
    const req = this.request(HTTPMethod.GET, this.uri.device(id));
    return req.then(json => {
      // Set the id since it's not included in the response
      json.id = id;
      return json;
    });
  }

  // Actions

  private action(device: BondDevice, action: Action): Promise<void> {
    return this.request(HTTPMethod.PUT, this.uri.action(device.id, action))
      .catch((error: string) => {
        console.error(`action '${action}' failed on device '${device.id}': ${error}`);
      });
  }

  public toggleOpen(device: BondDevice): Promise<void> {
    return this.action(device, Action.ToggleOpen);
  }

  public open(device: BondDevice): Promise<void> {
    return this.action(device, Action.Open);
  }

  public close(device: BondDevice): Promise<void> {
    return this.action(device, Action.Close);
  }

  // State

  public updateState(device: BondDevice, state: BondState): Promise<void> {
    return this.request(HTTPMethod.PATCH, this.uri.state(device.id), state)
      .catch((error: string) => {
          console.error(`update state failed on device '${device.id}': ${error}`);
      });
  }

  // Helpers

  private async request(method: HTTPMethod, uri: string, body: unknown = {}): Promise<any> {
    const uuid = randomUUID() // avoid duplicate action

    try {
      const response = await axios({
        method,
        url: uri,
        headers: {
          'BOND-Token': this.bondToken,
          'Bond-UUID': uuid,
        },
        data: body,
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const response_1 = error.response;
        switch (response_1.status) {
          case 401:
            console.error('unauthorized request: please check the `token` in your settings to see if it is correct');
            return;
          default:
            console.error(`request failed: [status] ${response_1.status} [statusText] ${response_1.statusText}`);
        }
      } else {
        console.error(`request failed: ${JSON.stringify(error)}`);
      }
    }
  }
}
