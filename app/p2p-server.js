const Websocket = require('ws');
const P2P_PORT = process.env.P2P_PORT || 5001;
const peers = process.env.PEERS ? process.env.PEERS.split(',') : [];

const MESSAGE_TYPES = {
	chain: 'CHAIN',
	transaction: 'TRANSACTION'
};

class P2pServer {
	constructor(blockchain, transactionPool){
		this.blockchain = blockchain;
		this.sockets = [];
		this.transactionPool = transactionPool;
	}

	listen(){
		const server = new Websocket.Server({port : P2P_PORT});
		server.on('connection', socket => this.connectSocket(socket));
		this.connectToPeers();
	}

	connectSocket(socket){
		this.sockets.push(socket);
		console.log('Socket connected');
		this.messageHandler(socket);
		this.sendChain(socket);
	}

	sendChain(socket){
		socket.send(JSON.stringify({type: MESSAGE_TYPES.chain,chain:
			this.blockchain.chain}));
	}

	connectToPeers(){
		peers.forEach(peers => {
			const socket = new Websocket(peers);
			socket.on('open', () => this.connectSocket(socket));
		});
	}

	messageHandler(socket) {
		socket.on('message', message => {
			const data = JSON.parse(message);
			switch(data.type) {
				case MESSAGE_TYPES.chain:
					this.blockchain.replaceChain(data);
					break;
				case MESSAGE_TYPES.transaction:
					this.transactionPool.updateOrAddTransaction(data.transaction);
					break;
			}
		});
	}

	syncChains(){
		this.sockets.forEach(socket => {
			this.sockets.forEach(socket => this.sendChain(socket));
		});
	}

	sendTransaction(socket, transaction) {
		socket.send(JSON.stringify({type: MESSAGE_TYPES.transaction, transaction}));
	}

	broadcastTransaction(transaction) {
		this.sockets.forEach(socket => this.sendTransaction(socket, transaction));
	}
}

module.exports = P2pServer;