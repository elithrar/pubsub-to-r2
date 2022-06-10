## pubsub-to-r2

An example [Cloudflare Worker](https://developers.cloudflare.com/workers/) that acts as an on-publish hook for [Pub/Sub](https://developers.cloudflare.com/pub-sub/) and copies a subset of messages to [R2 object storage](https://www.cloudflare.com/products/r2/).

To deploy this to your own account:

* Update `account_id` in `wrangler.toml` to use your own account ID
* Update the `[[r2_buckets]]` configuration in `wrangler.toml` to reference an R2 bucket that exists in your account ([see the R2 docs for more details](https://developers.cloudflare.com/r2/get-started/#4-bind-your-bucket-to-a-worker))
* Update the `BROKER_PUBLIC_KEYS` environmental variable with the public key set from your own Broker — the `.../pubsub/namespaces/{namespace}/brokers/{broker}/publickeys` endpoint in the API will return your broker-specific keys ([docs](https://developers.cloudflare.com/pub-sub/learning/integrate-workers/#connect-a-worker-to-a-broker))
* Publish it with `wrangler publish`

With the Worker deployed, you can then update your Broker configuration to use the Worker as an on-publish hook by setting the `on_publish.url` field to the URL of your Worker ([see the docs](https://developers.cloudflare.com/pub-sub/learning/integrate-workers/#connect-a-worker-to-a-broker)).

## License

BSD-3-Clause licensed. Copyright Cloudflare, Inc, 2022.