import type { CreateUserAttrs } from '$services/types';
import { genId } from '$services/utils';
import { client } from '$services/redis';
import { usersKey, usernamesUniqueKey, usernamesKey } from '$services/keys';

export const getUserByUsername = async (username: string) => {
    // Find user id with username argument in usernames sorted set
    const decimalId = await client.zScore(usernamesKey(), username); // id returned is in base10 format

    if (!decimalId) {
        throw new Error ('User does not exist');
    }
    
    // Convert id to base16 (hex) format
    const id = decimalId.toString(16);

    // Get user data
    const user = await client.hGetAll(usersKey(id));

    return deserialize(id, user);
};

export const getUserById = async (id: string) => {
    const user = await client.hGetAll(usersKey(id));
    
    return deserialize(id, user);
};

export const createUser = async (attrs: CreateUserAttrs) => {
    const id = genId();

    // Check if username is already in the set of usernames
    const exists = await client.sIsMember(
        usernamesUniqueKey(),
        attrs.username
    );

    if (exists) {
        // Throw an error if username already exists
        throw new Error('Username is taken');
    }

    // Proceed to user creation
    await client.hSet(
        usersKey(id),
        serialize(attrs)
    );

    //Add username to the set of taken usernames
    await client.sAdd(
        usernamesUniqueKey(),
        attrs.username
    );

    await client.zAdd(
        usernamesKey(),
        {
            value: attrs.username,
            score: parseInt(id, 16)
        }
    );

    return id;
};

const serialize = (user: CreateUserAttrs) => {
    return {
        username: user.username,
        password: user.password
    };
};

const deserialize = (id: string, user: { [key: string]: string }) => {
    return {
        id,
        username: user.username,
        password: user.password
    };
};