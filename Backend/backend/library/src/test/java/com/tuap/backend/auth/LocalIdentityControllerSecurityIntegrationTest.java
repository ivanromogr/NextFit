package com.tuap.backend.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.persistencia.ClienteDAO;

@SpringBootTest(properties = {
        "app.auth.google.enabled=true",
        "app.auth.google.allowed-audiences=test-google-client",
        "app.auth.apple.enabled=true",
        "app.auth.apple.allowed-audiences=test-apple-client"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LocalIdentityControllerSecurityIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private ClienteDAO clients;

    @MockBean private GoogleTokenVerifier googleVerifier;
    @MockBean private AppleTokenVerifier appleVerifier;
    @MockBean private ReauthenticationService reauthenticationService;
    @MockBean private LocalIdentityCreationService localIdentityCreationService;

    private AuthenticatedUser current;
    private String bearer;

    @BeforeEach
    void setUp() {
        String email = "local-controller-" + UUID.randomUUID() + "@test";
        Cliente client = clients.save(new Cliente("Security", "Local", email, null, "ROLE_CLIENTE", 0, 0, 0, "", "", ""));
        current = new AuthenticatedUser(client.getId(), email, Role.CLIENTE);
        bearer = jwtService.generateAccessToken(current);
    }

    @Test
    void localIdentityEndpointsWithoutJwtReturnMissingToken() throws Exception {
        mockMvc.perform(post("/api/auth/identities/local/reauth/google")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"test-google-credential\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("MISSING_TOKEN"));
        mockMvc.perform(post("/api/auth/identities/local/reauth/apple")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"identityToken\":\"test-apple-token\",\"nonce\":\"test-nonce\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("MISSING_TOKEN"));
        mockMvc.perform(post("/api/auth/identities/local")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reauthToken\":\"test-reauth\",\"password\":\"ValidPassword123\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("MISSING_TOKEN"));
    }

    @Test
    void authenticatedGoogleReauthUsesJwtPrincipalOnly() throws Exception {
        when(googleVerifier.verify("google-credential"))
                .thenReturn(new VerifiedGoogleIdentity("google-subject", current.email(), true, null, null, null));
        when(reauthenticationService.providerForCreateLocal(eq(current), any()))
                .thenReturn(new ReauthTokenResponse("safe-reauth", 300));

        mockMvc.perform(post("/api/auth/identities/local/reauth/google").header("Authorization", "Bearer " + bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"google-credential\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reauthToken").value("safe-reauth"));

        ArgumentCaptor<AuthenticatedUser> principal = ArgumentCaptor.forClass(AuthenticatedUser.class);
        verify(reauthenticationService).providerForCreateLocal(principal.capture(), any());
        org.junit.jupiter.api.Assertions.assertEquals(current, principal.getValue());
    }

    @Test
    void authenticatedAppleReauthUsesJwtPrincipalOnly() throws Exception {
        when(appleVerifier.verify("apple-credential", "nonce-1"))
                .thenReturn(new VerifiedAppleIdentity("apple-subject", current.email(), true, false, "nonce-1"));
        when(reauthenticationService.providerForCreateLocal(eq(current), any()))
                .thenReturn(new ReauthTokenResponse("safe-reauth", 300));

        mockMvc.perform(post("/api/auth/identities/local/reauth/apple").header("Authorization", "Bearer " + bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"identityToken\":\"apple-credential\",\"nonce\":\"nonce-1\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reauthToken").value("safe-reauth"));

        ArgumentCaptor<AuthenticatedUser> principal = ArgumentCaptor.forClass(AuthenticatedUser.class);
        verify(reauthenticationService).providerForCreateLocal(principal.capture(), any());
        org.junit.jupiter.api.Assertions.assertEquals(current, principal.getValue());
    }

    @Test
    void authenticatedCreateLocalUsesJwtPrincipalAndReturnsSafeDto() throws Exception {
        when(localIdentityCreationService.create(eq(current), any()))
                .thenReturn(new AuthIdentityLinkResponse(AuthProvider.LOCAL, AuthIdentityLinkResponse.Status.LINKED));

        mockMvc.perform(post("/api/auth/identities/local").header("Authorization", "Bearer " + bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reauthToken\":\"reauth\",\"password\":\"ValidPassword123\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.provider").value("LOCAL"))
                .andExpect(jsonPath("$.status").value("LINKED"))
                .andExpect(jsonPath("$.password").doesNotExist()).andExpect(jsonPath("$.providerSubject").doesNotExist())
                .andExpect(jsonPath("$.userId").doesNotExist()).andExpect(jsonPath("$.role").doesNotExist())
                .andExpect(jsonPath("$.tokenHash").doesNotExist()).andExpect(jsonPath("$.email").doesNotExist());

        ArgumentCaptor<AuthenticatedUser> principal = ArgumentCaptor.forClass(AuthenticatedUser.class);
        ArgumentCaptor<LocalIdentityCreationRequest> request = ArgumentCaptor.forClass(LocalIdentityCreationRequest.class);
        verify(localIdentityCreationService).create(principal.capture(), request.capture());
        org.junit.jupiter.api.Assertions.assertEquals(current, principal.getValue());
        org.junit.jupiter.api.Assertions.assertEquals("reauth", request.getValue().reauthToken());
        org.junit.jupiter.api.Assertions.assertEquals("ValidPassword123", request.getValue().password());
    }

    @Test
    void localCreateMapsSafeDomainErrors() throws Exception {
        doThrow(new LocalIdentityAlreadyExistsException()).when(localIdentityCreationService).create(eq(current), any());
        create("reauth").andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("LOCAL_IDENTITY_ALREADY_EXISTS"));

        doThrow(new InvalidReauthenticationTokenException()).when(localIdentityCreationService).create(eq(current), any());
        create("reauth").andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_REAUTH_TOKEN"));
    }

    @Test
    void googleReauthMapsUnverifiedEmailWithoutInternals() throws Exception {
        when(googleVerifier.verify("unverified-google"))
                .thenReturn(new VerifiedGoogleIdentity("google-subject", current.email(), false, null, null, null));

        mockMvc.perform(post("/api/auth/identities/local/reauth/google").header("Authorization", "Bearer " + bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"credential\":\"unverified-google\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("LOCAL_EMAIL_NOT_VERIFIED"))
                .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }

    @Test
    void localCreateMapsPasswordPolicyError() throws Exception {
        doThrow(new PasswordPolicyViolationException()).when(localIdentityCreationService).create(eq(current), any());

        create("reauth").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PASSWORD_POLICY_VIOLATION"));
    }

    private org.springframework.test.web.servlet.ResultActions create(String reauthToken) throws Exception {
        return mockMvc.perform(post("/api/auth/identities/local").header("Authorization", "Bearer " + bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reauthToken\":\"" + reauthToken + "\",\"password\":\"ValidPassword123\"}"));
    }
}
