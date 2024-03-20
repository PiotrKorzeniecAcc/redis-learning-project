import type { CreateItemAttrs } from '$services/types';
import { client } from '$services/redis';
import { serialize } from './serialize';
import { deserialize } from './deserialize';
import { genId } from '$services/utils';
import { itemsKey } from '$services/keys';

export const getItem = async (id: string) => {
    const item = await client.hGetAll(itemsKey(id));

    if (Object.keys(item).length === 0) {
        return null;
    }

    return deserialize(id, item);
};

export const getItems = async (ids: string[]) => {
    const commands = ids.map((id) => {
        // foreach ids as id add to command variable command client.hGetAll(id)
        return client.hGetAll(itemsKey(id));
    });

    const results = await Promise.all(commands);

    results.map((result, i) => {
        // foreach result determine if object exists and return it deserialized (with given id)
        if (Object.keys(result).length === 0) {
            return null;
        }

        return deserialize(ids[i], result);
    })
};

export const createItem = async (attrs: CreateItemAttrs, userId: string) => {
    const id = genId();
    const serialized = serialize(attrs);

    await client.hSet(itemsKey(id), serialized);

    return id;
};