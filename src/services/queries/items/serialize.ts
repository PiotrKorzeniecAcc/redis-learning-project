import type { CreateItemAttrs } from '$services/types';

export const serialize = (attrs: CreateItemAttrs) => {
    return {
        ...attrs,
        createdAt: attrs.createdAt.toMillis(), //serialize datetime vale to epoch format (miliseconds)
        endingAt: attrs.endingAt.toMillis()
    };
};
