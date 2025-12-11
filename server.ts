/** biome-ignore-all assist/source/organizeImports: <explanation> */
import { soInitConnection, soRead, soWrite, TCPConn } from "./helpers";
import * as net from "node:net";
import {
  bufPush,
  cutMessage,
  DynBuf,
  parseMessage,
} from "./helpers/dynamicBuffer";
// O que estudar/rever

// Event Loop (Server and browsers)
// Callbacks hell
// Promises and Async/Await

// We use Buffer instead of string for the URI and header fields
// Because there is no guarantee that URI and header fields must be
// ASCII or UTF-8 strings
type HTTPReq = {
  method: string;
  uri: Buffer;
  version: string;
  headers: Buffer[];
};

type HTTPRes = {
  code: number;
  headers: Buffer[];
  body: BodyReader;
};

type BodyReader = {
  length: number;
  read: () => Promise<Buffer>;
};

class HTTPError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "HTTPError";
  }
}

async function serveClient(socket: net.Socket): Promise<void> {
  const conn = soInitConnection(socket);
  const buf: DynBuf = {
    data: Buffer.alloc(0),
    length: 0,
  };
  while (true) {
    const msg: null | Buffer = parseMessage(buf);
    if (!msg) {
      const data: Buffer = await soRead(conn);
      bufPush(buf, data);
      if (data.length === 0) {
        return;
      }
      continue;
    }
    const data = await soRead(conn);
    if (data.length === 0) {
      console.log("Connection ended by client");
      break;
    }

    if (msg.equals(Buffer.from("quit\n"))) {
      await soWrite(conn, Buffer.from("Bye.\n"));
      socket.destroy();
      return;
    } else {
      const reply = Buffer.concat([Buffer.from("Echo: "), msg]);
      await soWrite(conn, reply);
    }
  }
}

async function serveClientNew(conn: TCPConn): Promise<void> {
  const buf: DynBuf = {
    data: Buffer.alloc(0),
    length: 0,
  };

  while (true) {
    // get 1 request header from the buffer
    const msg: null | HTTPReq = cutMessage(buf);

    if (!msg) {
      const data = await soRead(conn);
      bufPush(buf, data);
      if (data.length === 0 && buf.length === 0) {
        return;
      }
      if (data.length === 0) {
        throw new HTTPError(400, "Unexpected EOF.");
      }
      continue;
    }
    const reqBody: BodyReader = readerFromReq(conn, buf, msg);
    const res: HTTPRes = await handleReq(msg, reqBody);
    await writeHTTPResp(conn, res);
    // close the connection for HTTP/1.0
    if (msg.version === "1.0") {
      return;
    }
    // ma
    while ((await reqBody.read()).length > 0) {
      /* empty */
    }
  }
}
async function newConn(socket: net.Socket): Promise<void> {
	const conn: TCPConn = soInitConnection(socket);
	try {
	await serveClientNew(conn);
	} catch (exc) {
	console.error('exception:', exc);
	if (exc instanceof HTTPError) {
	// intended to send an error response
	const resp: HTTPRes = {
	code: exc.code,
	headers: [],
	body: readerFromMemory(Buffer.from(exc.message + '\n')),
	};
	try {
	await writeHTTPResp(conn, resp);
	} catch (exc) { /* ignore */ }
	}
	} finally {
	socket.destroy();
	}

const server = net.createServer({
  pauseOnConnect: true,
});

server.on("connection", newConn);
server.on("error", (err: Error) => {
  throw err;
});
server.listen({
  host: "127.0.0.1",
  port: 1234,
});
