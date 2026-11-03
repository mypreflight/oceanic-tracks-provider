<div align="center">

# oceanic-tracks-provider

The oceanic tracks function of the [**MyPreflight**][homepage] platform. Reads today's Pacific tracks from the FAA,
places every fix on the map, and serves them to the platform's backend as a component of its App Platform app.

</div>

## About

**MyPreflight** is a briefing service and electronic flight board app for your virtual flights, providing you realistic
figures, checklists, procedures and data to perform your flight like a real pilots do. You can customize your
experience, integrate with SimBrief and other tools. Check out our homepage at [mypreflight.io][homepage].

**This module** is a serverless function that turns oceanic track NOTAMs into data the platform can draw:

- reads the Pacific Organized Track System (PACOTS) from the [FAA NOTAM Management Service][nms]: westbound tracks
  from Oakland Oceanic (KZAK) and eastbound tracks from Fukuoka (RJJJ),
- reads both message formats, Oakland's one-line `TDM TRK` and Fukuoka's multi-track `FLEX ROUTE` blocks,
- places every fix: points such as `52N140W` from their own text, named fixes and navaids from the FAA's published
  aeronautical data, choosing the one nearest the track when a name exists in two places,
- reports what it could not read or place instead of guessing,
- keeps the FAA key and the FAA's rate limit in one place, away from the backend.

It exists as a separate service so the NOTAM formats, the FAA credentials and the FAA's limit of one data pull every
3 minutes stay behind one small contract. A failure here takes out the track layer, not the backend, and North
Atlantic tracks can join later without the backend changing.

The backend lives in [flight-tracker-api][repo-api] and the web app in [flight-tracker-app][repo-app].

[![integrity][ci-badge]][ci-url]
[![release][release-badge]][release-url]
[![license][license-badge]][license-url]

### Built with

[![TypeScript][ts-badge]][ts-url]
[![Node.js][node-shield]][node-url]
[![Biome][biome-badge]][biome-url]
[![Cucumber][cucumber-badge]][cucumber-url]
[![Docker][docker-badge]][docker-url]

No runtime dependencies: the function is the standard library plus compiled TypeScript.

## Getting started

### Environment

This app uses docker-based virtualization to run. To set up the project, follow these steps:

1. Clone the project by running:

   ```shell
   git clone git@github.com:mypreflight/oceanic-tracks-provider.git
   ```

2. Prepare an environment variable file by copying `.env.dist` to `.env`.

   ```shell
   cd oceanic-tracks-provider
   cp .env.dist .env
   ```

3. Use docker compose to set up the environment

   ```shell
   docker compose up -d --build
   ```

   Packages are installed automatically and the function starts in watch mode.

4. `docker compose` also starts `upstream-mock`, which answers for the FAA NOTAM service and the FAA fix directory
   with a recorded day of tracks, so nothing touches the FAA:

   ```shell
   curl "http://localhost:3020/"
   ```

### API documentation

The contract is `openapi.json` in the repository root: `GET /oceanic-tracks/tracks`, requiring the
`X-Require-Whisk-Auth` header. `flight-tracker-api` vendors it and mirrors it in hand-written types.

```shell
curl -H "X-Require-Whisk-Auth: $SECRET" \
  "https://<app-host>/oceanic-tracks/oceanic-tracks/tracks"
```

The function takes no arguments and answers with every track currently published:

```json
{
  "fetchedAt": "2026-11-03T22:02:47.722Z",
  "tracks": [
    {
      "system": "pacots",
      "identifier": "A",
      "direction": "west",
      "issuingAuthority": "KZAK",
      "notamNumber": "A5313/26",
      "validFrom": "2026-11-03T19:00:00.000Z",
      "validTo": "2026-11-04T08:00:00.000Z",
      "route": "PUPPI CRESP 23N170W 25N180E 27N170E 28N160E 31N150E TONIK",
      "levels": [],
      "fixes": [{ "ident": "PUPPI", "latitude": 21.921383, "longitude": -161.679633 }],
      "unresolvedFixes": [],
      "remarks": "TRK B NOT AVAILABLE",
      "message": "(TDM TRK A 261103190001 2611031900 2611040800 PUPPI CRESP …)"
    }
  ],
  "unreadableMessages": []
}
```

Errors answer `{ "error": { "code", "message", "status" } }` with a matching status: `502` when the FAA NOTAM service
or fix directory is unreachable or refuses the request, `500` when the FAA credentials are missing or anything else
fails.

### Where the fix positions come from

The FAA publishes its aeronautical data through public map services. The function asks three layers at once and
merges the answers:

| Layer | Covers | Updated |
| --- | --- | --- |
| Designated points | US airspace, including Oakland and Anchorage oceanic | Every AIRAC cycle |
| Navaid components | US navaids | Every AIRAC cycle |
| Designated point archive | Worldwide, including the Japanese fixes the tracks start and end at | Last edited 2016 |

A fix found in more than one place is resolved against its neighbours on the track: BOXER exists off the US coast
and in Australia, and a track starting at BOXER and heading to `52N140W` takes the American one. A fix no layer knows
is left out of `fixes` and named in `unresolvedFixes`.

## Build, test and deploy

This project uses [semantic versioning](https://semver.org/spec/v2.0.0.html). Bump the version in every PR:

```shell
npm version 1.1.0 --no-git-tag-version --prefix packages/oceanic-tracks/tracks
```

`integrity` checks the version is new, and the release workflow tags it when `main` moves. App Platform rebuilds the
component on the same push, from `project.yml`. First deployment needs the component adding to the app spec and its
secrets setting — see the [deployment guide][docs-deployment].

Everything runs in Docker:

```shell
docker compose exec tracks npm test
docker compose exec tracks npm run test:functional
docker compose exec tracks npm run typecheck
docker compose exec tracks npm run lint
docker compose exec tracks npm run build
```

## Contact

My name is Oskar, an experienced programmer, cybersecurity enthusiast, and conference speaker from Poland. Feel free to
contact me via the platforms below:

<div align="center">

[![LinkedIn][linkedin-badge]][linkedin-url]
[![GitHub][github-badge]][github-url]
[![Website][web-badge]][web-url]

</div>

## License

A public domain under the [Unlicense][license-url]. Do what you want with it. I am an experienced software engineer, but
I am not connected anyhow with the airline industry. This project is created for educational purposes only and should
not be used for real-world aviation operations. Track messages and aeronautical data come from the FAA.

[linkedin-badge]: https://img.shields.io/badge/Oskar%20Barcz-0A66C2?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTIwLjQ1IDIwLjQ1aC0zLjU1di01LjU3YzAtMS4zMy0uMDMtMy4wNC0xLjg1LTMuMDQtMS44NSAwLTIuMTQgMS40NS0yLjE0IDIuOTR2NS42N0g5LjM1VjloMy40MXYxLjU2aC4wNWMuNDgtLjkgMS42NC0xLjg1IDMuMzctMS44NSAzLjYgMCA0LjI3IDIuMzcgNC4yNyA1LjQ2djYuMjl6TTUuMzQgNy40M2MtMS4xNCAwLTIuMDYtLjkzLTIuMDYtMi4wNiAwLTEuMTQuOTItMi4wNiAyLjA2LTIuMDYgMS4xNCAwIDIuMDYuOTMgMi4wNiAyLjA2IDAgMS4xNC0uOTMgMi4wNi0yLjA2IDIuMDZ6bTEuNzggMTMuMDJIMy41NlY5aDMuNTZ2MTEuNDV6TTIyLjIzIDBIMS43N0MuNzkgMCAwIC43NyAwIDEuNzN2MjAuNTRDMCAyMy4yMy43OSAyNCAxLjc3IDI0aDIwLjQ1QzIzLjIgMjQgMjQgMjMuMjMgMjQgMjIuMjdWMS43M0MyNCAuNzcgMjMuMiAwIDIyLjIzIDB6Ii8%2BPC9zdmc%2B&logoColor=white
[linkedin-url]: https://www.linkedin.com/in/oskarbarcz
[github-badge]: https://img.shields.io/badge/@oskarbarcz-181717?style=for-the-badge&logo=github&logoColor=white
[github-url]: https://github.com/oskarbarcz
[web-badge]: https://img.shields.io/badge/barcz.me-4A5568?style=for-the-badge&logo=googlechrome&logoColor=white
[web-url]: https://barcz.me
[homepage]: https://mypreflight.io
[nms]: https://nms.aim.faa.gov
[repo-api]: https://github.com/oskarbarcz/flight-tracker-api
[repo-app]: https://github.com/oskarbarcz/flight-tracker-app
[ci-badge]: https://img.shields.io/github/actions/workflow/status/mypreflight/oceanic-tracks-provider/integrity.yaml?branch=main&style=for-the-badge&label=integrity
[ci-url]: https://github.com/mypreflight/oceanic-tracks-provider/actions/workflows/integrity.yaml
[release-badge]: https://img.shields.io/github/v/release/mypreflight/oceanic-tracks-provider?style=for-the-badge
[release-url]: https://github.com/mypreflight/oceanic-tracks-provider/releases/latest
[license-badge]: https://img.shields.io/github/license/mypreflight/oceanic-tracks-provider?style=for-the-badge
[license-url]: https://unlicense.org
[node-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[node-url]: https://nodejs.org
[ts-badge]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[ts-url]: https://www.typescriptlang.org
[docker-badge]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[docker-url]: https://www.docker.com
[docs-deployment]: docs/DEPLOYMENT.md
[biome-badge]: https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white
[biome-url]: https://biomejs.dev
[cucumber-badge]: https://img.shields.io/badge/Cucumber-23D96C?style=for-the-badge&logo=cucumber&logoColor=white
[cucumber-url]: https://cucumber.io
