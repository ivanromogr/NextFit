package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import java.util.UUID;
import com.tuap.backend.dominio.entidades.*;
import com.tuap.backend.persistencia.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {"app.auth.google.enabled=true", "app.auth.apple.enabled=true"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SocialAccountDeletionIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired ClienteDAO clientes;
    @Autowired EntrenadorDAO entrenadores;
    @Autowired AuthIdentityDAO identities;
    @Autowired RefreshTokenService refresh;
    @Autowired RefreshTokenDAO refreshTokens;
    @MockBean GoogleTokenVerifier google;
    @MockBean AppleTokenVerifier apple;
    Cliente owner;
    String bearer;
    @BeforeEach void setup() {
        owner = new Cliente(); owner.setNombre("Prueba"); owner.setApellido("Social");
        owner.setEmail(UUID.randomUUID() + "@nextfit.test"); owner.setRol("CLIENTE");
        owner.setGenero("NO_DECIR"); owner.setObjetivo("Fuerza"); owner.setContrasena(null);
        owner = clientes.saveAndFlush(owner);
        bearer = jwt.generateAccessToken(user());
        when(google.verify(anyString())).thenReturn(new VerifiedGoogleIdentity("own-google", owner.getEmail(), true, null, null, null));
        when(apple.verify(anyString(), anyString())).thenReturn(new VerifiedAppleIdentity("own-apple", null, false, true, "nonce"));
    }
    @Test void googleSinContrasenaDesactivaCuentaIdentidadesYSesiones() throws Exception {
        AuthIdentity identity = link(AuthProvider.GOOGLE, "own-google");
        refresh.issue(user(), ClientType.MOBILE);
        assertEquals(1, refreshTokens.findAll().stream().filter(t -> t.getUserId().equals(owner.getId())).count());
        mvc.perform(delete("/api/auth/account").header("Authorization", "Bearer " + bearer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"provider\":\"GOOGLE\",\"credential\":\"valid-fixture\"}"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
        assertFalse(clientes.findById(owner.getId()).orElseThrow().isActive());
        assertFalse(identity.isActive());
        assertTrue(refreshTokens.findAll().stream().filter(t -> t.getUserId().equals(owner.getId())).allMatch(t -> t.getRevokedAt() != null));
        mvc.perform(get("/api/auth/identities").header("Authorization", "Bearer " + bearer))
                .andExpect(status().isUnauthorized());
    }
    @Test void appleSinEmailNiContrasenaSeIdentificaPorSubject() throws Exception {
        link(AuthProvider.APPLE, "own-apple");
        request("{\"provider\":\"APPLE\",\"identityToken\":\"valid-fixture\",\"nonce\":\"nonce\"}")
                .andExpect(status().isOk());
        assertFalse(owner.isActive()); verify(apple).verify("valid-fixture", "nonce");
    }
    @Test void mismoEmailConOtroSubjectNoAutorizaLaBaja() throws Exception {
        link(AuthProvider.GOOGLE, "different-subject");
        rejected("{\"provider\":\"GOOGLE\",\"credential\":\"valid-fixture\"}");
    }
    @Test void identidadDesvinculadaNoAutoriza() throws Exception {
        AuthIdentity identity = link(AuthProvider.GOOGLE, "own-google"); identity.deactivate(); identities.saveAndFlush(identity);
        rejected("{\"provider\":\"GOOGLE\",\"credential\":\"valid-fixture\"}");
    }
    @Test void tokenInvalidoNoModificaLaCuenta() throws Exception {
        link(AuthProvider.GOOGLE, "own-google"); when(google.verify("invalid")).thenThrow(new InvalidGoogleTokenException());
        request("{\"provider\":\"GOOGLE\",\"credential\":\"invalid\"}").andExpect(status().isUnauthorized());
        assertTrue(owner.isActive());
    }
    @Test void credencialSinProveedorNoEsUnAtajoSinContrasena() throws Exception {
        rejected("{\"credential\":\"valid-fixture\"}"); verifyNoInteractions(google, apple);
    }
    @Test void metodosMezcladosSeRechazanAntesDelProveedor() throws Exception {
        rejected("{\"provider\":\"GOOGLE\",\"credential\":\"valid-fixture\",\"currentPassword\":\"password\"}");
        verifyNoInteractions(google, apple);
    }
    @Test void sesionAjenaNoPuedeUsarLaIdentidadDelPropietario() throws Exception {
        AuthIdentity identity = new AuthIdentity(UUID.randomUUID(), Role.CLIENTE, AuthProvider.GOOGLE, "own-google", owner.getEmail(), Instant.now());
        identities.saveAndFlush(identity);
        rejected("{\"provider\":\"GOOGLE\",\"credential\":\"valid-fixture\"}");
    }
    @Test void identidadDeOtroRolNoAutorizaLaBaja() throws Exception {
        identities.saveAndFlush(new AuthIdentity(owner.getId(), Role.ENTRENADOR, AuthProvider.GOOGLE, "own-google", owner.getEmail(), Instant.now()));
        rejected("{\"provider\":\"GOOGLE\",\"credential\":\"valid-fixture\"}");
    }
    @Test void sinJwtNoSeInvocaElProveedor() throws Exception {
        mvc.perform(delete("/api/auth/account").contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"GOOGLE\",\"credential\":\"valid-fixture\"}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(google, apple); assertTrue(owner.isActive());
    }
    @Test void entrenadorSocialSinContrasenaSeDaDeBajaYDesvinculaClientes() throws Exception {
        Entrenador trainer = new Entrenador(); trainer.setNombre("Trainer"); trainer.setApellido("Prueba");
        trainer.setEmail(UUID.randomUUID() + "@nextfit.test"); trainer.setRol("ENTRENADOR"); trainer.setEspecialidad("Fuerza");
        trainer = entrenadores.saveAndFlush(trainer);
        owner.setEntrenador(trainer); clientes.saveAndFlush(owner);
        identities.saveAndFlush(new AuthIdentity(trainer.getId(), Role.ENTRENADOR, AuthProvider.GOOGLE, "own-google", trainer.getEmail(), Instant.now()));
        String token = jwt.generateAccessToken(new AuthenticatedUser(trainer.getId(), trainer.getEmail(), Role.ENTRENADOR));
        mvc.perform(delete("/api/auth/account").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"provider\":\"GOOGLE\",\"credential\":\"valid-fixture\"}"))
                .andExpect(status().isOk());
        assertFalse(trainer.isActive()); assertNull(owner.getEntrenador()); assertTrue(owner.isActive());
    }
    private AuthenticatedUser user() { return new AuthenticatedUser(owner.getId(), owner.getEmail(), Role.CLIENTE); }
    private AuthIdentity link(AuthProvider provider, String subject) {
        return identities.saveAndFlush(new AuthIdentity(owner.getId(), Role.CLIENTE, provider, subject, owner.getEmail(), Instant.now()));
    }
    private org.springframework.test.web.servlet.ResultActions request(String json) throws Exception {
        return mvc.perform(delete("/api/auth/account").header("Authorization", "Bearer " + bearer).contentType(MediaType.APPLICATION_JSON).content(json));
    }
    private void rejected(String json) throws Exception {
        request(json).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_REAUTH_TOKEN"));
        assertTrue(owner.isActive());
    }
}
