# Deployment

The function is a functions component of the `mypreflight` App Platform app, built from this repository. App Platform reads `project.yml`, so there is no image to publish.

## First deployment

1. Generate the shared secret the API will send:

   ```shell
   openssl rand -hex 32
   ```

2. Merge `.do/app.component.yaml` into the app spec. Put its ingress rule ahead of the catch-all `/` rules already there, because App Platform matches rules in order.

   ```shell
   doctl apps spec get <app-id> > app.yaml
   # merge the functions and ingress blocks from .do/app.component.yaml
   doctl apps update <app-id> --spec app.yaml
   ```

3. Set the component's environment in the App Platform console, all at run time:

   | Variable | Value | Encrypted |
   | --- | --- | --- |
   | `OCEANIC_TRACKS_FUNCTION_SECRET` | The secret from step 1 | Yes |
   | `NMS_CLIENT_ID` | The KEY from the FAA's credentials spreadsheet | Yes |
   | `NMS_CLIENT_SECRET` | The SECRET from the same spreadsheet | Yes |
   | `NMS_API_HOST` | `https://api-staging.cgifederal-aim.com` for a pre-production key, `https://api-nms.aim.faa.gov` for a production key | No |

   Leaving `NMS_API_HOST` empty means production.

4. Give the API component the matching pair:

   | Variable | Value |
   | --- | --- |
   | `OCEANIC_TRACKS_FUNCTION_BASE_URL` | `https://<app-host>/oceanic-tracks/oceanic-tracks` |
   | `OCEANIC_TRACKS_FUNCTION_SECRET` | The secret from step 1 |

5. Check the function answers:

   ```shell
   curl -H "X-Require-Whisk-Auth: $SECRET" "https://<app-host>/oceanic-tracks/oceanic-tracks/tracks"
   ```

   A `502` with `NMS_UNAVAILABLE` means the FAA refused the key or the host does not match it. The function log names the status the FAA answered.

## Switching to a production key

Replace `NMS_CLIENT_ID` and `NMS_CLIENT_SECRET`, and set `NMS_API_HOST` to `https://api-nms.aim.faa.gov` or empty it. A pre-production key is refused by production with `ClientId is Invalid`, and the other way round.
