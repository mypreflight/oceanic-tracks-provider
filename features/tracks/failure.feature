Feature: Reporting failures honestly
  As the flight tracker backend
  I want upstream trouble reported with a distinct status and code
  So that an outage is never mistaken for a day without tracks

  Scenario: Refused credentials answer bad gateway
    Given the NOTAM service refuses the credentials
    When I invoke the function
    Then the response status should be 502
    And the response body should contain:
      """
      {
        "error": {
          "code": "NMS_UNAVAILABLE",
          "message": "The FAA NOTAM service is unavailable.",
          "status": 502
        }
      }
      """

  Scenario Outline: A failing NOTAM request answers bad gateway
    Given the NOTAM service issues tokens
    And Oakland publishes today's track messages
    And the NOTAM service answers <status> for Fukuoka
    When I invoke the function
    Then the response status should be 502
    And the response body should contain:
      """
      {
        "error": {
          "code": "NMS_UNAVAILABLE",
          "message": "The FAA NOTAM service is unavailable.",
          "status": 502
        }
      }
      """

    Examples:
      | status |
      | 500    |
      | 429    |
      | 403    |

  Scenario: An access token refused mid-flight is renewed once, then reported
    Given the NOTAM service issues tokens
    And the NOTAM service answers 401 for Oakland
    When I invoke the function
    Then the response status should be 502
    And the NOTAM service should have issued 2 tokens
    And the NOTAM service should have been asked for Oakland 2 times

  Scenario Outline: A failing fix directory answers bad gateway
    Given the NOTAM service issues tokens
    And Oakland publishes today's track messages
    And Fukuoka publishes today's track messages
    And the fix directory knows today's fixes
    And the fix directory layer of "<layer>" <trouble>
    When I invoke the function
    Then the response status should be 502
    And the response body should contain:
      """
      {
        "error": {
          "code": "FIX_DIRECTORY_UNAVAILABLE",
          "message": "The FAA fix directory is unavailable.",
          "status": 502
        }
      }
      """

    Examples:
      | layer                      | trouble                  |
      | designated points          | is unavailable           |
      | archived designated points | answers with an error    |

  Scenario: Missing credentials are a configuration error
    Given the NMS credentials are not configured
    When I invoke the function
    Then the response status should be 500
    And the response body should contain:
      """
      {
        "error": {
          "code": "NMS_NOT_CONFIGURED",
          "message": "The FAA NOTAM service credentials are not configured.",
          "status": 500
        }
      }
      """

  Scenario: A failed lookup is not cached
    Given the NOTAM service issues tokens
    And the NOTAM service answers 500 for Oakland
    When I invoke the function
    And I invoke the function
    Then the response status should be 502
    And the NOTAM service should have been asked for Oakland 2 times
