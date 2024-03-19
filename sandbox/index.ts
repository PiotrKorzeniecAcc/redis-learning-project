import 'dotenv/config';
import { client } from '../src/services/redis';

const run = async () => {
    await client.hSet('carHash', {
        color: 'red',
        year: 1950
    });

    const car = await client.hGetAll('carHash');

    console.log(car);
};
run();
