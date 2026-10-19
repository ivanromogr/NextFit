package com.tuap.backend.auth;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AuthControllerTest {

    private AuthService authService;
    private JwtService jwtService;
    private PasswordResetService passwordResetService;
    private RefreshTokenService refreshTokenService;
    private RefreshTokenProperties refreshTokenProperties;
    private EmailChangeService emailChangeService;
    private AccountDeletionService accountDeletionService;
    private AuthController controller;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        authService = Mockito.mock(AuthService.class);
        jwtService = Mockito.mock(JwtService.class);
        passwordResetService = Mockito.mock(PasswordResetService.class);
        refreshTokenService = Mockito.mock(RefreshTokenService.class);
        emailChangeService = Mockito.mock(EmailChangeService.class);
        accountDeletionService = Mockito.mock(AccountDeletionService.class);
        refreshTokenProperties = new RefreshTokenProperties();
        when(refreshTokenService.issue(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new RefreshTokenService.IssuedToken("refresh-token", "refresh-hash", UUID.randomUUID(), java.time.Instant.now().plusSeconds(3600)));
        when(jwtService.getAccessTokenTtlSeconds()).thenReturn(900L);
        when(jwtService.generateAccessToken(org.mockito.ArgumentMatchers.any())).thenReturn("signed-access-token");
        controller = new AuthController(authService, jwtService, passwordResetService, refreshTokenService, refreshTokenProperties, emailChangeService, accountDeletionService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new AuthExceptionHandler())
                .build();
    }

    @Test
    void login_Cliente_DevuelveSoloIdentidadNormalizada() throws Exception {
        UUID id = UUID.randomUUID();
        when(authService.authenticate(anyString(), anyString()))
                .thenReturn(new AuthenticatedUser(id, "cliente@nextfit.test", Role.CLIENTE));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"cliente@nextfit.test\",\"password\":\"secreto\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(id.toString()))
                .andExpect(jsonPath("$.user.email").value("cliente@nextfit.test"))
                .andExpect(jsonPath("$.user.role").value("CLIENTE"))
                .andExpect(jsonPath("$.accessToken").value("signed-access-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void login_Entrenador_DevuelveRolCanonico() throws Exception {
        when(authService.authenticate(anyString(), anyString())).thenReturn(
                new AuthenticatedUser(UUID.randomUUID(), "entrenador@nextfit.test", Role.ENTRENADOR));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"entrenador@nextfit.test\",\"password\":\"secreto\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ENTRENADOR"));
    }

    @Test
    void login_CredencialesInvalidas_OcultaLaCausa() throws Exception {
        when(authService.authenticate(anyString(), anyString())).thenThrow(new BadCredentialsException("detalle interno"));

        assertUnauthorized("{\"email\":\"cliente@nextfit.test\",\"password\":\"incorrecta\"}");
    }

    @Test
    void login_UsuarioInexistente_OcultaLaCausa() throws Exception {
        when(authService.authenticate(anyString(), anyString())).thenThrow(new UsernameNotFoundException("ausente"));

        assertUnauthorized("{\"email\":\"nadie@nextfit.test\",\"password\":\"secreto\"}");
    }

    @Test
    void login_IdentidadAmbigua_OcultaLaCausa() throws Exception {
        when(authService.authenticate(anyString(), anyString())).thenThrow(new AmbiguousIdentityException());

        assertUnauthorized("{\"email\":\"duplicado@nextfit.test\",\"password\":\"secreto\"}");
    }

    @Test
    void login_BodyInvalido_Devuelve400() throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void forgot_ExistenteEInexistente_DevuelvenContratoNeutralIdentico() throws Exception {
        String expected = "Si existe una cuenta asociada, se han enviado instrucciones para restablecer la contraseña";
        mockMvc.perform(post("/api/auth/password/forgot").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"existe@test\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.message").value(expected));
        mockMvc.perform(post("/api/auth/password/forgot").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"nadie@test\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.message").value(expected));
    }



    private void assertUnauthorized(String body) throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Credenciales no válidas"));
    }
}
