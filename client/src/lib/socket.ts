import { hc } from 'hono/client';
import { encodeBase32LowerCaseNoPadding } from '@oslojs/encoding';

class SocketConn {
  private socket: WebSocket | null = null;
  private timeout: number;
  private closed: boolean;

  private onMessage?: (event: MessageEvent) => void;

  constructor(
    url: string,
    query: object,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMessage?: (message: any) => void,
    timeout: number = 2500
  ) {
    this.timeout = timeout;
    this.closed = false;

    this.onMessage = onMessage;

    this.connect(url, query);
  }

  private connect(url: string, query: object) {
    const client = hc(url);
    this.socket = client.ws.$ws({ query });

    // Auto retry on close
    this.socket.addEventListener('close', () => {
      if (!this.closed) {
        console.error('WebSocket unexpectedly closed, reconnecting in 1s...');
        setTimeout(() => this.connect(url, query), 1_000);
      }
    });

    this.socket.addEventListener('error', () => {
      console.error('WebSocket encountered an error, closing');
      this.closed = true;
      this.socket!.close();
      this.socket = null;
    });

    if (this.onMessage) {
      this.socket.addEventListener('message', (e) => {
        this.onMessage!(JSON.parse(e.data));
      });
    }
  }

  public async send(
    data: object,
    onAcknowledged?: () => void,
    onIgnored?: () => void
  ) {
    if (!this.socket) {
      console.error('WebSocket not open, cannot send message');
      return;
    }

    const message_id = this.genId();

    // Send the message
    this.socket.send(
      JSON.stringify({
        ...data,
        message_id
      })
    );

    // If this timeout reaches completion, our message has been ignored
    const ignore_timeout = setTimeout(() => {
      this.socket?.removeEventListener('message', handleOnMessage);
      onIgnored?.();
    }, this.timeout);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleOnMessage = (event: any) => {
      const message = JSON.parse(event.data);

      if (message.acknowledged === message_id) {
        this.socket?.removeEventListener('message', handleOnMessage);
        clearTimeout(ignore_timeout);
        onAcknowledged?.();
      }
    };

    this.socket.addEventListener('message', handleOnMessage);
  }

  public close() {
    if (!this.socket) {
      console.error('WebSocket not open, cannot close');
      return;
    }

    this.closed = true;
    this.socket.close();
    this.socket = null;
  }

  private genId() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return encodeBase32LowerCaseNoPadding(bytes);
  }
}

export default SocketConn;
