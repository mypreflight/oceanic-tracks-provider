Feature: Listing the Pacific tracks
  As the flight tracker backend
  I want today's Pacific tracks with every fix placed on the map
  So that pilots can see the tracks without reading the NOTAMs themselves

  Background:
    Given the NOTAM service issues tokens
    And the fix directory knows today's fixes
    And the NAT feed publishes no tracks

  Scenario: Both directions are listed, westbound from Oakland and eastbound from Fukuoka
    Given Oakland publishes today's track messages
    And Fukuoka publishes today's track messages
    When I invoke the function
    Then the response status should be 200
    And the response should list the tracks "A, C, E, F, H, J, 1, 2, 3, 11, 14"
    And every track should be placed in full
    And the unreadable messages should be ""
    And the response body should have the property "fetchedAt"

  Scenario: An Oakland track carries its route, fixes and remarks
    Given Oakland publishes today's track messages
    And Fukuoka publishes today's track messages
    When I invoke the function
    Then the track "A" should contain:
      """
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
        "fixes": [
          { "ident": "PUPPI", "latitude": 21.921383, "longitude": -161.679633 },
          { "ident": "CRESP", "latitude": 22.205556, "longitude": -163.914444 },
          { "ident": "23N170W", "latitude": 23, "longitude": -170 },
          { "ident": "25N180E", "latitude": 25, "longitude": 180 },
          { "ident": "27N170E", "latitude": 27, "longitude": 170 },
          { "ident": "28N160E", "latitude": 28, "longitude": 160 },
          { "ident": "31N150E", "latitude": 31, "longitude": 150 },
          { "ident": "TONIK", "latitude": 32.003806, "longitude": 145.996414 }
        ],
        "unresolvedFixes": [],
        "remarks": "TRK B NOT AVAILABLE",
        "message": "(TDM TRK A 261103190001 2611031900 2611040800 PUPPI CRESP 23N170W 25N180E 27N170E 28N160E 31N150E TONIK RTS/PHNL KEOLA PUPPI TONIK G223 BEGAD RMK/TRK B NOT AVAILABLE )"
      }
      """

  Scenario: A Fukuoka message is split into its tracks, which share its validity
    Given Oakland publishes no track messages
    And Fukuoka publishes today's track messages
    When I invoke the function
    Then the response should list the tracks "1, 2, 3, 11, 14"
    And the track "11" should contain:
      """
      {
        "system": "pacots",
        "identifier": "11",
        "direction": "east",
        "issuingAuthority": "RJJJ",
        "notamNumber": "Q2635/26",
        "validFrom": "2026-11-04T10:00:00.000Z",
        "validTo": "2026-11-04T21:00:00.000Z",
        "route": "LEPKI 38N160E 38N170E 36N180E 32N170W THOMA",
        "levels": [],
        "fixes": "@any",
        "unresolvedFixes": [],
        "remarks": "TRK 12 NOT AVAILABLE\nATM CENTER TEL:81-92-608-8870",
        "message": "@any"
      }
      """
    And the track "2" should pass through "KALNA 41N160E 43N170E 45N180E 46N170W 46N160W 45N150W 43N140W 41N130W TRYSH"

  Scenario: A fix name used in two places takes the one beside the track
    Given Oakland publishes today's track messages
    And Fukuoka publishes no track messages
    When I invoke the function
    Then the track "F" should contain:
      """
      {
        "system": "pacots",
        "identifier": "F",
        "direction": "west",
        "issuingAuthority": "KZAK",
        "notamNumber": "A5311/26",
        "validFrom": "2026-11-03T19:00:00.000Z",
        "validTo": "2026-11-04T08:00:00.000Z",
        "route": "ALCOA ALLBE ADTIL 35N140W 33N150W 31N160W 30N170W 30N180E 30N170E 31N160E 33N150E MORAY",
        "levels": [],
        "fixes": [
          { "ident": "ALCOA", "latitude": "@any", "longitude": "@any" },
          { "ident": "ALLBE", "latitude": "@any", "longitude": "@any" },
          { "ident": "ADTIL", "latitude": "@any", "longitude": "@any" },
          { "ident": "35N140W", "latitude": 35, "longitude": -140 },
          { "ident": "33N150W", "latitude": 33, "longitude": -150 },
          { "ident": "31N160W", "latitude": 31, "longitude": -160 },
          { "ident": "30N170W", "latitude": 30, "longitude": -170 },
          { "ident": "30N180E", "latitude": 30, "longitude": 180 },
          { "ident": "30N170E", "latitude": 30, "longitude": 170 },
          { "ident": "31N160E", "latitude": 31, "longitude": 160 },
          { "ident": "33N150E", "latitude": 33, "longitude": 150 },
          { "ident": "MORAY", "latitude": 34.296903, "longitude": 145.996319 }
        ],
        "unresolvedFixes": [],
        "remarks": null,
        "message": "@any"
      }
      """

  Scenario: A fix the directory cannot place is reported, not guessed
    Given the fix directory knows today's fixes except "ECOMI"
    And Oakland publishes today's track messages
    And Fukuoka publishes no track messages
    When I invoke the function
    Then the response status should be 200
    And the track "C" should leave "ECOMI" unplaced
    And the track "C" should pass through "KATCH HMPTN GRIZZ CJAYY 58N160W 58N170W NATES NIKLL NYMPH NUZAN NRKEY NIPPI"

  Scenario: A message that cannot be read is listed rather than dropped silently
    Given Oakland publishes the track message "A5399/26":
      """
      TDM TRK Q WILL BE PUBLISHED LATER
      """
    And Fukuoka publishes no track messages
    When I invoke the function
    Then the response status should be 200
    And the response should list the tracks ""
    And the unreadable messages should be "A5399/26"

  Scenario: A cancellation is not taken for a track
    Given Oakland publishes the cancellation "A5320/26":
      """
      (TDM TRK A 261103190001 2611031900 2611040800 PUPPI CRESP 23N170W TONIK RMK/0)
      """
    And Fukuoka publishes no track messages
    When I invoke the function
    Then the response should list the tracks ""
    And the unreadable messages should be ""

  Scenario: No data found for an issuer means no tracks, not an outage
    Given the NOTAM service finds no data for Oakland
    And Fukuoka publishes today's track messages
    When I invoke the function
    Then the response status should be 200
    And the response should list the tracks "1, 2, 3, 11, 14"

  Scenario: Every NOTAM request is authorised and asks for GeoJSON
    Given Oakland publishes today's track messages
    And Fukuoka publishes today's track messages
    When I invoke the function
    Then every NOTAM request should carry the token and ask for GeoJSON

  Scenario: The tracks are fetched once and served from cache afterwards
    Given Oakland publishes today's track messages
    And Fukuoka publishes today's track messages
    When I invoke the function
    And I invoke the function
    Then the response status should be 200
    And the NOTAM service should have issued 1 token
    And the NOTAM service should have been asked for Oakland 1 time
    And the NOTAM service should have been asked for Fukuoka 1 time
