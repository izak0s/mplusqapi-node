/**
 * Example usage — run with:
 *   npx ts-node --project scripts/tsconfig.json example.ts
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
} from './src';

const client = new MplusKassaClient({
    host: process.env.MPLUS_HOST ?? '',
    port: Number(process.env.MPLUS_PORT ?? 0),
    ident: process.env.MPLUS_IDENT ?? '',
    secret: process.env.MPLUS_SECRET ?? '',
});

async function main() {
    const print = await client.reportPrintableFinancialTotals({
        dateFilter: {
            fromFinancialDate: new Date(2025, 1, 1),
            throughFinancialDate: new Date(2026, 6, 1)
        }
    });
    console.log(print);
    await client.createOrderV3({})
    await client.createRelation({})
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
