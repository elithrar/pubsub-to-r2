// An example that shows how to asynchronously write Pub/Sub messages to R2
// storage.

/// <reference types="@cloudflare/workers-types" />

import { isValidBrokerRequest, PubSubMessage } from "@cloudflare/pubsub";

async function writeJSONToBucket(
  bucket: R2Bucket,
  key: string,
  payload: Array<PubSubMessage>
): Promise<R2Object> {
  let serializedMessages = JSON.stringify(payload);
  return await bucket.put(key, serializedMessages, {
    httpMetadata: {
      contentType: "application/json",
    },
  });
}

async function pubsub(
  messages: Array<PubSubMessage>,
  env: any,
  ctx: ExecutionContext
): Promise<Array<PubSubMessage>> {
  // "TRASHCAN" is the binding associated with our R2 bucket, as configured in
  // wrangler.toml
  let destBucket: R2Bucket = env.TRASHCAN;

  // Messages we want to copy to R2 storage
  let messagesToCopy: Array<PubSubMessage> = [];

  // Messages may be batched at higher throughputs, so we should loop over
  // the incoming messages and process them as needed.
  for (let msg of messages) {
    // We want to copy messages in the below topic to our R2 bucket
    if (msg.topic.startsWith("devices/metadata/")) {
      messagesToCopy.push(msg);
    }
  }

  if (messagesToCopy.length > 0) {
    // Although we write the messages "as-is" to our bucket, we could also
    // copy the fields into a new object and write that to R2 instead.
    //
    // waitUntil() doesn't block the response back to our Pub/Sub Broker
    // Read more: https://developers.cloudflare.com/workers/runtime-apis/fetch-event/#waituntil
    ctx.waitUntil(
      writeJSONToBucket(destBucket, await crypto.randomUUID(), messagesToCopy)
    );
  }

  // In this example, we don't filter (drop) any messages, and
  // forward all messages on to our subscribers.
  return messages;
}

const worker = {
  async fetch(req: Request, env: any, ctx: ExecutionContext) {
    // Each Broker has a unique key to distinguish between your Broker vs. others
    // These keys are available at /pubsub/namespaces/{namespace}/brokers/{broker}/publickeys
    //
    // We store these keys in environmental variables (https://developers.cloudflare.com/workers/platform/environment-variables/)
    // to avoid needing to fetch them on every request.
    let publicKeys = env.BROKER_PUBLIC_KEYS;

    // Critical: you must validate the incoming request is from your Broker.
    //
    // In the future, Workers will be able to do this on your behalf for Workers
    // in the same account as your Pub/Sub Broker.
    if (await isValidBrokerRequest(req, publicKeys)) {
      // Parse the PubSub message
      let incomingMessages: Array<PubSubMessage> = await req.json();

      // Pass the messages to our pubsub handler, and capture the returned
      // message.
      let outgoingMessages = await pubsub(incomingMessages, env, ctx);

      // Re-serialize the messages and return a HTTP 200.
      // The Content-Type is optional, but must either by
      // "application/octet-stream" or left empty.
      return new Response(JSON.stringify(outgoingMessages), { status: 200 });
    }

    return new Response("not a valid Broker request", { status: 403 });
  },
};

export default worker;
