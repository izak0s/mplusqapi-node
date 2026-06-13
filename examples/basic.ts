/**
 * Example usage — run with:
 *   npx ts-node --project scripts/tsconfig.json examples/basic.ts
 *
 * Set env vars before running:
 *   MPLUS_HOST=api.mpluskassa.nl
 *   MPLUS_PORT=PORT
 *   MPLUS_IDENT=your-ident
 *   MPLUS_SECRET=your-secret
 */

import {
    MplusKassaClient,
    MplusApiClientError,
    MplusApiServerError,
    MplusApiCommunicationError,
} from '../src';

const client = new MplusKassaClient({
    host: process.env.MPLUS_HOST ?? '',
    port: Number(process.env.MPLUS_PORT ?? 0),
    ident: process.env.MPLUS_IDENT ?? '',
    secret: process.env.MPLUS_SECRET ?? '',
});

async function main() {
    // Fetch API version
    const version = await client.getApiVersion();
    console.log(`API: ${version.majorNumber}.${version.minorNumber}.${version.revisionNumber}`);

    // Fetch orders (returns Order[] directly — list wrappers are unwrapped)
    const orders = await client.getOrders({ syncMarker: 0, syncMarkerLimit: 10 });
    for (const order of orders) {
        console.log(order.orderId, order.financialDate);
    }

// Fetch a single relation — `relation` is undefined when result is NOT-FOUND
    const { result, relation } = await client.getRelation(42);
    if (result === 'GET-RELATION-RESULT-OK') {
        console.log(relation?.name, relation?.email);
    }
}

main().catch((err: unknown) => {
    if (err instanceof MplusApiClientError) {
        console.error(`\nClient error [${err.faultCode}]: ${err.message}`);
        console.error('\n--- XML Request ---');
        console.error(err.xmlRequest);
        console.error('\n--- XML Response ---');
        console.error(err.xmlResponse);
    } else if (err instanceof MplusApiServerError) {
        console.error(`\nServer error [${err.faultCode}]: ${err.message}`);
        console.error('\n--- XML Request ---');
        console.error(err.xmlRequest);
    } else if (err instanceof MplusApiCommunicationError) {
        console.error(`\nCommunication error: ${err.message}`);
        if (err.xmlRequest) console.error('\n--- XML Request ---\n', err.xmlRequest);
        if (err.xmlResponse) console.error('\n--- XML Response ---\n', err.xmlResponse);
    } else {
        console.error('\nUnexpected error:', err);
    }
    process.exit(1);
});
