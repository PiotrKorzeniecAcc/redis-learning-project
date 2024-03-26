import type { CreateBidAttrs, Bid } from '$services/types';
import { bidHistoryKey, itemsKey, itemsByPriceKey } from '$services/keys';
import { client, withLock } from '$services/redis';
import { DateTime } from 'luxon';
import { getItem } from './items'

export const createBid = async (attrs: CreateBidAttrs) => {
	return withLock(attrs.itemId, async (signal: any) => {		// concurrency issue solved with lock functionality
		const item = await getItem(attrs.itemId);

		// Does the item exist?
		if (!item) {
			throw new Error('Item does not exist');
		}

		// Is the item still open for bids?
		if (item.endingAt.diff(DateTime.now()).toMillis() < 0) {
			throw new Error('Item closed to bidding');
		}

		// Is the bid amount greater that the existing highest bid?
		if (item.price >= attrs.amount) {
			throw new Error('Bid too low');
		}

		const serialized = serializeHistory(
			attrs.amount,
			attrs.createdAt.toMillis()
		);

		if (signal.expired) {
			throw new Error('Lock is expired. Cannot write any more data.');
		}

		return Promise.all(
			[
				client.rPush(bidHistoryKey(attrs.itemId), serialized),	  		// add the bid to bid history list
				client.hSet(												  	// update bids count, price and userId of user with highest bid
					itemsKey(item.id),
					{
						bids: item.bids + 1,
						price: attrs.amount,
						highestBidUserId: attrs.userId
					}
				),
				client.zAdd(
					itemsByPriceKey(),
					{
						value: item.id,
						score: attrs.amount
					}
				),
			]
		);
	});
//	return client.executeIsolated(async (isolatedClient) => {	// concurrency issue solved with WATCH-MULTI-EXEC
//		await isolatedClient.watch(itemsKey(attrs.itemId));
//
//		const item = await getItem(attrs.itemId);
//
//		// Does the item exist?
//		if (!item) {
//			throw new Error('Item does not exist');
//		}
//
//		// Is the item still open for bids?
//		if (item.endingAt.diff(DateTime.now()).toMillis() < 0) {
//			throw new Error('Item closed to bidding');
//		}
//
//		// Is the bid amount greater that the existing highest bid?
//		if (item.price >= attrs.amount) {
//			throw new Error('Bid too low');
//		}
//
//		const serialized = serializeHistory(
//			attrs.amount,
//			attrs.createdAt.toMillis()
//			);
//
//		return isolatedClient.multi()
//			.rPush(bidHistoryKey(attrs.itemId), serialized)		  					// add the bid to bid history list
//			.hSet(												  					// update bids count, price and userId of user with highest bid
//				itemsKey(item.id),
//				{
//					bids: item.bids + 1,
//					price: attrs.amount,
//					highestBidUserId: attrs.userId
//				}
//			)
//			.zAdd(
//				itemsByPriceKey(),
//				{
//					value: item.id,
//					score: attrs.amount
//				}
//			)
//			.exec();
//	});
};

export const getBidHistory = async (itemId: string, offset = 0, count = 10): Promise<Bid[]> => {
	const startIndex = -1 * offset - count;
	const endIndex = -1 - offset;

	const range = await client.lRange(
		bidHistoryKey(itemId),
		startIndex,
		endIndex
	);

	return range.map(bid => deserializeHistory((bid)));
};

const serializeHistory = (amount: number, createdAt: number) => {
	return `${amount}:${createdAt}`;
};

const deserializeHistory = (stored: string) => {
	const [amount, createdAt] = stored.split(':');

	return {
		amount: parseFloat(amount),
		createdAt: DateTime.fromMillis(parseInt(createdAt))
	};
};