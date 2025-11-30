// The need for dynamic buffers
// Our socket dont receive data/messages in the exact size or format we want
// Example  i.e. data received { schools : ["Long vs data sent { schools : [{"Longwood", "Hillbrow"}] }
// Por que precisamos de Dynamic Buffer?
// TCP pode enviar seus dados assim:
//   Envio: '{"name":"Alice"}'
//   Chega: '{"name"' + ':"Ali' + 'ce"}'
//
// Precisamos "juntar os pedaços" antes de usar

// O TCP fragmenta suas mensagens em pacotes em tamanhos variados, garantindo apenas a ordem de chegada e a entrega
// Mas não garante que as mensagens cheguem em "pedaços" do tamanho que esperamos
// Por isso precisamos de buffers dinâmicos para "juntar os pedaços" antes de processar as mensagens

export type DynBuf = {
	data: Buffer;
	length: number;
};

export function bufPush(buf: DynBuf, newDataToAdd: Buffer): void {
	const newLengthOfBuffer = buf.length + newDataToAdd.length;
	if (buf.data.length < newLengthOfBuffer) {
		// We need to increase the size of the buffewr
		let capacity = Math.max(buf.data.length, 32);
		while (capacity < newLengthOfBuffer) {
			capacity *= 2;
		}
		const grownBuffer = Buffer.alloc(capacity);
		buf.data.copy(grownBuffer, 0, 0);
		buf.data = grownBuffer;
	}
	newDataToAdd.copy(buf.data, buf.length, 0);
	buf.length = newLengthOfBuffer;
}

export function parseMessage(buf: DynBuf): null | Buffer {
	const idx = buf.data.subarray(0, buf.length).indexOf("\n"); // messages separated by \n
	if (idx < 0) {
		return null; // no complete message yet
	}
	// make a copy of the message and move the remaining data to the front
	const msg = Buffer.from(buf.data.subarray(0, idx + 1)); // extract the message
	bufPop(buf, idx + 1);
	return msg;
}

export function bufPop(buf: DynBuf, sizeToRemove: number): void {
	buf.data.copyWithin(0, sizeToRemove, buf.length);
	buf.length -= sizeToRemove;
}
