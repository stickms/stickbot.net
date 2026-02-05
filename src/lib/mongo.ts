import { type Collection, MongoClient } from 'mongodb';
import type { DatabasePlayerEntry } from '~/types';

const uri = process.env.MONGO_API_URL;

let collection: Promise<Collection<DatabasePlayerEntry>>;

export function playersDB() {
	if (!collection) {
		if (!uri) {
			throw new Error('MONGODB_URI is not defined in environment variables');
		}
		const client = new MongoClient(uri);
		collection = client
			.connect()
			.then(() =>
				client.db('stickbot').collection<DatabasePlayerEntry>('players')
			);
	}
	return collection;
}
