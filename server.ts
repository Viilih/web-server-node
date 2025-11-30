/** biome-ignore-all assist/source/organizeImports: <explanation> */
import { soInitConnection, soRead, soWrite } from "./helpers";
import * as net from "node:net";
import { bufPush, DynBuf, parseMessage } from "./helpers/dynamicBuffer";
// O que estudar/rever

// Event Loop (Server and browsers)
// Callbacks hell
// Promises and Async/Await

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

async function newConn(socket: net.Socket): Promise<void> {
	console.log("new connection", socket.remoteAddress, socket.remotePort);

	try {
		await serveClient(socket);
	} catch (error) {
		console.error("Error serving client:", error);
	} finally {
		socket.destroy();
	}
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
