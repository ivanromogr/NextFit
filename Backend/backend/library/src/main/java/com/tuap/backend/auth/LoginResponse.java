package com.tuap.backend.auth;

/** Login response containing a short-lived access token and safe user identity. */
public record LoginResponse(String accessToken, String tokenType, long expiresIn, AuthUserResponse user, String refreshToken) {
    public static LoginResponse from(AuthenticatedUser user, String accessToken, long expiresIn) {
        return new LoginResponse(accessToken, "Bearer", expiresIn, AuthUserResponse.from(user), null);
    }
    public static LoginResponse mobile(AuthenticatedUser user, String accessToken, long expiresIn, String refreshToken) {
        return new LoginResponse(accessToken, "Bearer", expiresIn, AuthUserResponse.from(user), refreshToken);
    }
}
