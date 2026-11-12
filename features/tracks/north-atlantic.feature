Feature: Listing the North Atlantic tracks
  As the flight tracker backend
  I want today's North Atlantic tracks beside the Pacific ones, with their levels and every fix placed
  So that pilots crossing the Atlantic can see the tracks without reading the track message themselves

  Background:
    Given the NOTAM service issues tokens
    And the fix directory knows today's fixes

  Scenario: Both directions are listed, eastbound from Gander and westbound from Shanwick
    Given the NAT feed publishes today's tracks
    And Oakland publishes no track messages
    And Fukuoka publishes no track messages
    When I invoke the function
    Then the response status should be 200
    And the response should list the tracks "S, T, U, V, W, X, Y, Z, A, B, C, D, E, F, G"
    And the unreadable messages should be ""

  Scenario: A track carries its route, levels, fixes and the message's remarks
    Given the NAT feed publishes today's tracks
    And Oakland publishes no track messages
    And Fukuoka publishes no track messages
    When I invoke the function
    Then the track "A" should contain:
      """
      {
        "system": "nat",
        "identifier": "A",
        "direction": "west",
        "issuingAuthority": "EGGX",
        "notamNumber": "EGGX1112/26",
        "validFrom": "2026-11-12T11:30:00.000Z",
        "validTo": "2026-11-12T19:00:00.000Z",
        "route": "DOGAL 55/20 56/30 56/40 55/50 LOMSI",
        "levels": [340, 350, 360, 370, 380, 390, 400],
        "fixes": [
          { "ident": "DOGAL", "latitude": 54, "longitude": -15 },
          { "ident": "55/20", "latitude": 55, "longitude": -20 },
          { "ident": "56/30", "latitude": 56, "longitude": -30 },
          { "ident": "56/40", "latitude": 56, "longitude": -40 },
          { "ident": "55/50", "latitude": 55, "longitude": -50 },
          { "ident": "LOMSI", "latitude": 53.1, "longitude": -56.783333 }
        ],
        "unresolvedFixes": [],
        "remarks": "1. TMI IS 316.\n2. SEND RCL 90 TO 30 MINUTES PRIOR TO OCEANIC ENTRY POINT. INCLUDE MAX LEVEL IN RCL.\n3. PBCS OTS LEVELS 340 TO 400. PBCS TRACKS AS FOLLOWS TRACK A TRACK B TRACK C TRACK D TRACK E TRACK F TRACK G END OF PBCS OTS.\n4. SLOP SHOULD BE USED IN NAT AIRSPACE. LEFT SLOP PROHIBITED.\n5. 10 MINUTES AFTER PASSING OEP SQUAWK 2000 UNLESS OTHERWISE INSTRUCTED.\n6. ADS C AND CPDLC ARE MANDATED FOR LEVELS 290 TO 410 IN NAT AIRSPACE.\n7. UK AIP ENR 2.2 PARA 3.5.2 STATES THAT NAT OPERATORS SHALL FILE PRM'S.\n8. OPERATORS ARE REMINDED TO ONLY USE NAT TRACK DESIGNATORS IN FLIGHT PLANS WHEN FLYING THE WHOLE LENGTH OF THE NAT TRACK.\n9. DATA LINK EQUIPPED FLIGHTS NOT LOGGED ONTO DOMESTIC AIRSPACE PRIOR TO ENTERING THE SHANWICK OCA MUST INITIATE A LOGON TO EGGX 10 TO 25 MINS PRIOR TO OCA ENTRY.\n10. EGGX HAS DELAYED IMPLENTATION OF OCR UNTIL FURTHER NOTICE.\n11. NOTIFY ANY GNSS INTERFERENCE IN RCL CONFIRMING RNP CAPABILITY.",
        "message": "@any"
      }
      """

  Scenario: An eastbound track takes the levels Gander publishes for it
    Given the NAT feed publishes today's tracks
    And Oakland publishes no track messages
    And Fukuoka publishes no track messages
    When I invoke the function
    Then the track "Y" should contain:
      """
      {
        "system": "nat",
        "identifier": "Y",
        "direction": "east",
        "issuingAuthority": "CZQX",
        "notamNumber": "CZQX1113/26",
        "validFrom": "2026-11-13T01:00:00.000Z",
        "validTo": "2026-11-13T08:00:00.000Z",
        "route": "JOBOC 41/60 42/50 42/40",
        "levels": [350, 370],
        "fixes": "@any",
        "unresolvedFixes": [],
        "remarks": "@any",
        "message": "@any"
      }
      """

  Scenario: Half-degree points sit on the half degree, and a fix nobody holds is left unplaced
    Given the NAT feed publishes today's tracks
    And Oakland publishes no track messages
    And Fukuoka publishes no track messages
    When I invoke the function
    Then the track "B" should pass through "NEBIN 5430/20 5530/30 5530/40 5430/50"
    And the track "B" should leave "MELDI" unplaced
    And the track "U" should pass through "4630/50 4830/40 5030/30 5230/20 TOBOR RILED"
    And the track "U" should leave "RELIC" unplaced

  Scenario: A fix name used in two places takes the one beside the track
    Given the NAT feed publishes today's tracks
    And Oakland publishes no track messages
    And Fukuoka publishes no track messages
    When I invoke the function
    Then the track "C" should contain:
      """
      {
        "system": "nat",
        "identifier": "C",
        "direction": "west",
        "issuingAuthority": "EGGX",
        "notamNumber": "EGGX1112/26",
        "validFrom": "@any",
        "validTo": "@any",
        "route": "MALOT 54/20 55/30 55/40 54/50 NEEKO",
        "levels": "@any",
        "fixes": [
          { "ident": "MALOT", "latitude": 53, "longitude": -15 },
          { "ident": "54/20", "latitude": 54, "longitude": -20 },
          { "ident": "55/30", "latitude": 55, "longitude": -30 },
          { "ident": "55/40", "latitude": 55, "longitude": -40 },
          { "ident": "54/50", "latitude": 54, "longitude": -50 },
          { "ident": "NEEKO", "latitude": 52.4, "longitude": -55.833333 }
        ],
        "unresolvedFixes": [],
        "remarks": "@any",
        "message": "@any"
      }
      """

  Scenario: The North Atlantic tracks are listed beside the Pacific ones
    Given the NAT feed publishes today's tracks
    And Oakland publishes today's track messages
    And Fukuoka publishes today's track messages
    When I invoke the function
    Then the response status should be 200
    And the response should list the tracks "S, T, U, V, W, X, Y, Z, A, B, C, D, E, F, G, A, C, E, F, H, J, 1, 2, 3, 11, 14"

  Scenario: A message that cannot be read is listed rather than dropped silently
    Given the NAT feed publishes the message "EGGX1199/26":
      """
      NAT-1/1 TRACKS WILL BE PUBLISHED LATER
      """
    And Oakland publishes no track messages
    And Fukuoka publishes no track messages
    When I invoke the function
    Then the response status should be 200
    And the response should list the tracks ""
    And the unreadable messages should be "EGGX1199/26"

  Scenario: The Pacific tracks are still served when the North Atlantic feed is down
    Given the NAT feed answers 500
    And Oakland publishes today's track messages
    And Fukuoka publishes today's track messages
    When I invoke the function
    Then the response status should be 200
    And the response should list the tracks "A, C, E, F, H, J, 1, 2, 3, 11, 14"

  Scenario: Tracks served without the North Atlantic ones are not cached
    Given the NAT feed answers 500
    And Oakland publishes today's track messages
    And Fukuoka publishes today's track messages
    When I invoke the function
    And I invoke the function
    Then the NAT feed should have been asked 2 times
    And the NOTAM service should have been asked for Oakland 2 times

  Scenario: The North Atlantic feed is read once and served from cache afterwards
    Given the NAT feed publishes today's tracks
    And Oakland publishes today's track messages
    And Fukuoka publishes today's track messages
    When I invoke the function
    And I invoke the function
    Then the NAT feed should have been asked 1 time
