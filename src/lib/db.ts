import { MongoClient } from 'mongodb';
import type { DatabasePlayerEntry } from '~/types';

const uri = process.env.MONGO_API_URL;

let connected = false;
let client: MongoClient;

export async function playersDB() {
	if (!uri) {
		throw new Error('MONGODB_URI is not defined in environment variables');
	}

	if (!connected) {
		try {
			client = new MongoClient(uri);
			await client.connect();
			connected = true;
		} catch (error) {
			throw new Error(
				`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	return client.db('stickbot').collection<DatabasePlayerEntry>('players');
}
