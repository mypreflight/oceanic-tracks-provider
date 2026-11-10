# oceanic-tracks-provider

The oceanic tracks function: today's Pacific tracks (PACOTS) from the FAA NOTAM Management Service, with every fix placed on the map, for the MyPreflight API.

Last reviewed: 2026-11-10

This repo is part of MyPreflight. The knowledge base lives in the product repo, [mypreflight/product](https://github.com/mypreflight/product). It is the primary source of truth for product decisions. Read it by URL before working here:

- Start: https://raw.githubusercontent.com/mypreflight/product/main/CLAUDE.md
- Data sources: https://raw.githubusercontent.com/mypreflight/product/main/product/data-sources.md

If this file or the code contradicts the knowledge base, the knowledge base takes precedence. Flag the conflict; don't silently change either side.

## Repo-specific notes

Keep this short. Anything shared between repos belongs in the knowledge base.

- Run locally: `cp .env.dist .env`, then `docker compose up -d --build`. Compose also starts `upstream-mock`, which stands in for both the FAA NOTAM service and the FAA fix directory, so nothing touches the FAA.
- Test: `docker compose exec app npm run lint`, `npm run typecheck`, `npm test` and `npm run test:functional`.
- Layers, under `src`: `domain` holds the track model, coordinates, both message parsers and fix placement, and does no I/O. `application` holds the list-current-tracks use case and its 5-minute cache, the PACOTS issuers, the ports `TrackMessageSource` and `FixDirectory`, and errors that carry no HTTP status. `infra` holds the NMS and fix directory clients that implement the ports, and the HTTP handler that maps each error to its status and code. `shared` holds the logger, and `lambda.ts` wires everything together and answers the Function URL. Dependencies point inwards only; `architecture.spec.ts` fails when `domain` imports anything outside itself, `application` imports `infra`, or any layer imports `lambda.ts`.
- Deploy: bump with `docker compose exec app npm version <x.y.z> --no-git-tag-version`. Merging to `main` tags the version and applies the OpenTofu stack in `infra/`, which uploads the bundle `./zip.sh` builds to AWS Lambda. Details: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- The API vendors `openapi.json` and mirrors it in hand-written types. Change the contract here and in the API together.
- The FAA key belongs to MyPreflight. It comes from the `NMS_CLIENT_ID` and `NMS_CLIENT_SECRET` secrets of this repository's `production` environment, which the deploy writes to SSM as write-only values and the function reads from its environment. Never commit it, log it or put it in a fixture. The FAA's onboarding documents are marked internal, so they stay out of this repo too.
- The FAA allows one data pull every 3 minutes in production. The function makes two NOTAM requests per refresh, 1.1 seconds apart, and caches the result for 5 minutes. Don't shorten that cache or add requests without checking the limit.
- Fix positions come from three FAA layers, queried together: current designated points, current navaids, and the 2016 designated point archive. The current layers only cover US airspace, so Japanese fixes come from the archive. When a name exists in more than one place, the one nearest its neighbours on the track wins.

When your change alters product behaviour, also open a PR to the knowledge base updating the matching file.
