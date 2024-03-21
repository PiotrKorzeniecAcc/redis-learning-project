import { client } from "$services/redis";
import { itemsKey, itemsByViewsKey } from "$services/keys";

export const incrementView = async (itemId: string, userId: string) => {
    return Promise.all(
        [
            client.hIncrBy(         // Increment the item hash views
                itemsKey(itemId),
                'views',
                1
            ),
            client.zIncrBy(         // Increment the sorted set score
                itemsByViewsKey(),
                1,
                itemId
            )
        ]
    );
};
