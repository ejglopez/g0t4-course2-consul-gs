import { Resolver } from "dns/promises";
import nodemailer from "nodemailer";
import { config } from "./config.mjs";

function resolve(host) {
  const resolver = new Resolver();
  return resolver.resolve(host);
}

function sendOrderedEmail() {
  // TLDR: resolving directly to bypass issue in nodemailer ( see below )
  return resolve(config.SMTP_HOST).then((records) => {
    const firstRecord = records[0];
    // tested: no records => promise is rejected (pre-condition - always array w/ 1+ records)
    // tested: single record is also wrapped in array (as per docs)
    const transporter = nodemailer.createTransport({
      pool: false,
      host: firstRecord,
      port: config.SMTP_PORT,
      secure: false,
    });

    return transporter.sendMail({
      from: "orders@example.com",
      to: "user@example.com",
      subject: "Order submitted",
      text: "Hi your order was placed successfully, your items will arrive soon. Thanks!",
    });
  });
}

export { sendOrderedEmail };

/* 

node's promise-based DNS resolver:
- https://nodejs.org/dist/latest-v18.x/docs/api/dns.html#dns-promises-api
- use dns.lookup instead? a more broadly applicable example?

consider resolve SRV sample?
- to resolve IP and port for SMTP service
- https://nodejs.org/dist/latest-v18.x/docs/api/dns.html#dnspromisesresolvesrvhostname

Nodemailer:
- https://nodemailer.com

Notes about nodemailer dns caching issues:
- nodemailer isn't re-resolving DNS at record expiration
  - cursory inspection - uses hard coded TTL of 5 minutes:
  - https://github.com/nodemailer/nodemailer/blob/e8b2db3d081bf7307d6382b97d2b5dc4b7a8fe05/lib/shared/index.js#L127
  - https://github.com/nodemailer/nodemailer/blob/e8b2db3d081bf7307d6382b97d2b5dc4b7a8fe05/lib/shared/index.js#L161
  - https://github.com/nodemailer/nodemailer/blob/e8b2db3d081bf7307d6382b97d2b5dc4b7a8fe05/lib/shared/index.js#L205

- also, release 6.7.0 changed handling of responses w/ multiple DNS records
  - https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md#670-2021-10-11
  - loops over the multiple responses instead of just caching (and using) the first record
  - this explanation confirms cursory inspection that shows hard coded caching that doesn't respect DNS record TTL (doesn't even factor it in)

- TLDR: using DNS resolver directly to bypass hard coded caching in nodemailer

*/
