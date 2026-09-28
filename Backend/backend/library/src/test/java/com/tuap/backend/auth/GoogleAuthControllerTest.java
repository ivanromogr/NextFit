package com.tuap.backend.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class GoogleAuthControllerTest {
    private GoogleAuthenticationService google;
    private JwtService jwt;
    private RefreshTokenService refresh;
    private MockMvc mvc;

    @BeforeEach void setUp() {
        AuthService auth = Mockito.mock(AuthService.class); jwt = Mockito.mock(JwtService.class);
        refresh = Mockito.mock(RefreshTokenService.class); google = Mockito.mock(GoogleAuthenticationService.class);
        RefreshTokenProperties refreshProperties = new RefreshTokenProperties();
        when(refresh.issue(any(), any())).thenReturn(new RefreshTokenService.IssuedToken("refresh-value", "hash", UUID.randomUUID(), Instant.now().plusSeconds(600)));
        when(jwt.generateAccessToken(any())).thenReturn("nextfit-access"); when(jwt.getAccessTokenTtlSeconds()).thenReturn(900L);
        AuthController controller = new AuthController(auth, jwt, Mockito.mock(PasswordResetService.class), refresh, refreshProperties,
                Mockito.mock(EmailChangeService.class), Mockito.mock(AccountDeletionService.class), Mockito.mock(UserDataExportService.class));
        ReflectionTestUtils.setField(controller, "googleAuthenticationService", google);
        mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new AuthExceptionHandler()).build();
    }

    @Test void existingGoogleIdentityUsesExistingWebSessionContract() throws Exception {
        when(google.authenticate(any())).thenReturn(GoogleAuthenticationResult.authenticated(user(Role.ENTRENADOR)));
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"redacted\",\"role\":\"CLIENTE\"}"))
                .andExpect(status().isOk()).andExpect(header().exists("Set-Cookie"))
                .andExpect(jsonPath("$.accessToken").value("nextfit-access")).andExpect(jsonPath("$.user.role").value("ENTRENADOR"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist()).andExpect(jsonPath("$.providerSubject").doesNotExist());
    }

    @Test void existingGoogleIdentityUsesExistingMobileSessionContract() throws Exception {
        when(google.authenticate(any())).thenReturn(GoogleAuthenticationResult.authenticated(user(Role.CLIENTE)));
        mvc.perform(post("/api/auth/google").header("X-Client-Type", "MOBILE").contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"redacted\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.refreshToken").value("refresh-value"))
                .andExpect(jsonPath("$.providerSubject").doesNotExist());
    }

    @Test void incompleteResponseDoesNotExposeSubjectOrIssueSession() throws Exception {
        when(google.authenticate(any())).thenReturn(GoogleAuthenticationResult.incomplete(SocialAuthResponse.onboarding("new@test")));
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"redacted\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ONBOARDING_REQUIRED"))
                .andExpect(jsonPath("$.provider").value("GOOGLE")).andExpect(jsonPath("$.email").value("new@test"))
                .andExpect(jsonPath("$.accessToken").doesNotExist()).andExpect(jsonPath("$.providerSubject").doesNotExist());
    }

    @Test void disabledGoogleIsControlled503() throws Exception {
        when(google.authenticate(any())).thenThrow(new GoogleAuthDisabledException());
        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"redacted\"}"))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("GOOGLE_AUTH_DISABLED"));
    }

    private AuthenticatedUser user(Role role) { return new AuthenticatedUser(UUID.randomUUID(), "user@test", role); }
}
