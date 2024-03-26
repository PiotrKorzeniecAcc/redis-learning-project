import { randomBytes } from 'crypto';
import { client } from './client';

export const withLock = async (key: string, cb: (signal: any) => any) => {
	// Initialize variables to control retry behavior
	const retryDelayMs = 100;
	let retries = 20;

	// Generate random value to store at the lock key
	const token = randomBytes(6).toString('hex');

	// Create the lock key
	const lockKey = `lock:${key}`;

	// Set up a while loop to implement the retry behavior
	retries--;
	while (retries >= 0) {
		// Try to do a SET NX operation
		const acquired = await client.set(
			lockKey,
			token,
			{
				NX: true,
				PX: 2000
			}
		)

		// If successful, then run the callback
		// Else brief pause(retryDelayMs) and retry
		if (!acquired) {
			await pause(retryDelayMs);
			continue;
		}

		try {
			const signal = { expired: false };
			setTimeout(() => {
				signal.expired = true;
			}, 2000);

			return await cb(signal);
		} finally {
			// Unset the lock key
			await client.unlock(lockKey, token);
		}
	}
};

const buildClientProxy = () => {};

const pause = (duration: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};
