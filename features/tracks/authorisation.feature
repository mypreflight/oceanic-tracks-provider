Feature: Answering only the backend
  As the flight tracker backend
  I want the function to refuse anyone without the function secret
  So that the FAA key and its rate limit are spent on my requests only

  Scenario: A request without the function secret is refused
    When I invoke the function without the function secret
    Then the response status should be 401
    And the response header "WWW-Authenticate" should be "Bearer"
    And the response body should contain:
      """
      {
        "error": {
          "code": "UNAUTHORIZED",
          "message": "The Authorization header is missing or wrong.",
          "status": 401
        }
      }
      """
    And the NOTAM service should have issued 0 tokens

  Scenario: A request with the wrong token is refused
    When I invoke the function with the token "not-the-function-secret"
    Then the response status should be 401
    And the NOTAM service should have issued 0 tokens
