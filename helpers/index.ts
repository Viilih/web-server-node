import * as net from "net";

type TCPConn = {
	socket: net.Socket;
	err: null | Error;
	ended: boolean;
	reader: null | {
		resolve: (value: Buffer) => void;
		reject: (reason: Error) => void;
	};
};

type TCPListener = {
	socket: net.Socket;
};

export function soInitConnection(socket: net.Socket): TCPConn {
	const conn: TCPConn = {
		socket: socket,
		reader: null,
		err: null,
		ended: false,
	};

	socket.on("data", (data: Buffer) => {
		conn.socket.pause();

		conn.reader?.resolve(data);
		conn.reader = null;
	});

	socket.on("error", (error: Error) => {
		conn.err = error;

		if (conn.reader) {
			conn.reader.reject(error);
			conn.reader = null;
		}
	});
	return conn;
}

export function soRead(conn: TCPConn): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		if (conn.err) {
			return reject(conn.err);
		}

		if (conn.ended) {
			resolve(Buffer.from(""));
			return;
		}
		conn.reader = { resolve, reject };
		conn.socket.resume();
	});
}

export function soWrite(conn: TCPConn, data: Buffer): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		if (conn.err) {
			reject(conn.err);
		}

		conn.socket.write(data, (err?: Error | null) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

export function soAccept(listener: TCPListener): Promise<TCPConn> {
	return new Promise<TCPConn>((resolve, reject) => {
		listener.socket.once("connection", (socket: net.Socket) => {
			const conn = soInitConnection(socket);
			resolve(conn);
		});
	});
}
