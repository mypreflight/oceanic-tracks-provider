# Deployment

The function runs on AWS Lambda (`nodejs24.x`, arm64) behind a Function URL. The OpenTofu stack in `infra/` owns all of it: the function, its role, its log group, the Function URL, the function secret and the SSM parameters the API reads. Its state is `oceanic-tracks-provider/terraform.tfstate` in the `mypreflight-infra` bucket, encrypted with the `alias/mypreflight-state-key` KMS key.

## How a change ships

1. `./zip.sh` builds the `export` stage of the `Dockerfile` and zips the one bundled file, `lambda.js`, into `dist.zip`.
2. On a pull request, `integrity` builds the zip and plans `infra/` with `dflook/tofu-plan`, through the plan role. The FAA credentials are placeholders there, so a plan never sees them.
3. On a merge to `main`, `release` tags the version and applies `infra/` with `dflook/tofu-apply` in the `production` environment, which uploads the new `dist.zip`.

## Configuration

| Variable | Comes from | Notes |
| --- | --- | --- |
| `OCEANIC_TRACKS_FUNCTION_SECRET` | `random_password` in `infra/lambda.tf` | Also published at SSM `/mypreflight/oceanic-tracks-provider/secret` for the API. |
| `NMS_CLIENT_ID`, `NMS_CLIENT_SECRET` | The `production` environment secrets of this repository | Written to SSM `/mypreflight/oceanic-tracks-provider/nms-client-id` and `nms-client-secret` as write-only values, then read back into the function's environment. |
| `NMS_API_HOST` | `nms_api_host` in `infra/variables.tf` | `https://api-staging.cgifederal-aim.com` for a pre-production key, `https://api-nms.aim.faa.gov` for a production key. |

The Function URL is published at SSM `/mypreflight/oceanic-tracks-provider/url`. The API's stack reads it and the secret into `OCEANIC_TRACKS_FUNCTION_BASE_URL` and `OCEANIC_TRACKS_FUNCTION_SECRET`.

A write-only value is only written again when its version changes. To push new FAA credentials, update the two environment secrets and raise `nms_credentials_version` in `infra/variables.tf`.

## Checking the function

```shell
URL=$(aws ssm get-parameter --name /mypreflight/oceanic-tracks-provider/url --query Parameter.Value --output text)
SECRET=$(aws ssm get-parameter --name /mypreflight/oceanic-tracks-provider/secret --with-decryption \
  --query Parameter.Value --output text)

curl -H "Authorization: Bearer $SECRET" "$URL/tracks"
```

A `401` with `UNAUTHORIZED` means the token does not match the secret. A `502` with `NMS_UNAVAILABLE` means the FAA refused the key or the host does not match it. The function log names the status the FAA answered:

```shell
aws logs tail /aws/lambda/oceanic-tracks-provider --follow
```

## Switching to a production key

Replace the `NMS_CLIENT_ID` and `NMS_CLIENT_SECRET` environment secrets, raise `nms_credentials_version`, and set `nms_api_host` to `https://api-nms.aim.faa.gov`. A pre-production key is refused by production with `ClientId is Invalid`, and the other way round.
