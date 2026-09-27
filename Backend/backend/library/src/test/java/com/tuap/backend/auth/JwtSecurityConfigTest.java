package com.tuap.backend.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.json.JsonContent;
import org.springframework.test.web.servlet.MvcResult;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JwtSecurityConfigTest {
    private static final String TEST_SECRET = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private com.tuap.backend.persistencia.ClienteDAO clienteDAO;
    @Autowired private com.tuap.backend.persistencia.EntrenadorDAO entrenadorDAO;
    @Autowired private com.tuap.backend.persistencia.UserConsentDAO consentDAO;

    @Test
    void rutasPublicas_PermanecenAccesiblesSinToken() throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void rutaProtegida_SinTokenDevuelve401Json() throws Exception {
        mockMvc.perform(get("/api/clientes/" + UUID.randomUUID()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("MISSING_TOKEN"));
    }

    @Test
    void exportacionDatos_SinTokenDevuelve401Json() throws Exception {
        mockMvc.perform(get("/api/auth/data-export"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("MISSING_TOKEN"));
    }

    @Test
    void exportacionDatos_ClienteAutenticadoDevuelveJsonYHeadersPrivados() throws Exception {
        String token = registerToken("CLIENTE", "exportacion-cliente@nextfit.test");

        mockMvc.perform(get("/api/auth/data-export").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("application/json")))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Pragma", "no-cache"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.matchesPattern(".*attachment.*nextfit-data-\\d{4}-\\d{2}-\\d{2}\\.json")))
                .andExpect(jsonPath("$.generatedAt").isNotEmpty())
                .andExpect(jsonPath("$.accountType").value("CLIENTE"))
                .andExpect(jsonPath("$.profile.email").value("exportacion-cliente@nextfit.test"))
                .andExpect(jsonPath("$.consents").isArray())
                .andExpect(jsonPath("$.consents[0].type").isNotEmpty())
                .andExpect(jsonPath("$.profile.contrasena").doesNotExist());
    }

    @Test
    void bearerValido_PermiteAlcanzarRutaProtegida() throws Exception {
        String token = jwtService.generateAccessToken(new AuthenticatedUser(UUID.randomUUID(), "cliente@nextfit.test", Role.CLIENTE));
        mockMvc.perform(get("/api/clientes/" + UUID.randomUUID()).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
    }

    @Test
    void bearerInvalidoYExpirado_Devuelven401Json() throws Exception {
        mockMvc.perform(get("/api/clientes/" + UUID.randomUUID()).header("Authorization", "Bearer no-es-jwt"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
        mockMvc.perform(get("/api/clientes/" + UUID.randomUUID()).header("Authorization", "Bearer " + expiredToken()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("TOKEN_EXPIRED"));
    }

    @Test
    void rolesYOperacionesAdministrativas_Devuelven403() throws Exception {
        String clientToken = jwtService.generateAccessToken(new AuthenticatedUser(UUID.randomUUID(), "cliente@nextfit.test", Role.CLIENTE));
        String trainerToken = jwtService.generateAccessToken(new AuthenticatedUser(UUID.randomUUID(), "entrenador@nextfit.test", Role.ENTRENADOR));
        mockMvc.perform(post("/api/entrenador/" + UUID.randomUUID() + "/fichar").header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_TOKEN"));
        mockMvc.perform(put("/api/clientes/" + UUID.randomUUID()).header("Authorization", "Bearer " + trainerToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/ejercicios/importar").header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registroCliente_EmiteContratoJwtValidable() throws Exception {
        assertRegistration("CLIENTE", "registro-cliente@nextfit.test");
    }

    @Test
    void registroEntrenador_EmiteContratoJwtValidable() throws Exception {
        assertRegistration("ENTRENADOR", "registro-entrenador@nextfit.test");
    }

    @Test
    void registroExigeConsentimientosYNoCreaCuenta() throws Exception {
        for (String role : new String[] { "CLIENTE", "ENTRENADOR" }) {
            String termsEmail = "sin-terms-" + role.toLowerCase() + "@nextfit.test";
            mockMvc.perform(post("/api/register").contentType(MediaType.APPLICATION_JSON).content(registrationJson(role, termsEmail, false, true, false)))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("TERMS_NOT_ACCEPTED"));
            assertTrue(clienteDAO.findByEmail(termsEmail).isEmpty()); assertTrue(entrenadorDAO.findByEmail(termsEmail).isEmpty());
            String privacyEmail = "sin-privacy-" + role.toLowerCase() + "@nextfit.test";
            mockMvc.perform(post("/api/register").contentType(MediaType.APPLICATION_JSON).content(registrationJson(role, privacyEmail, true, false, false)))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PRIVACY_NOT_ACCEPTED"));
            assertTrue(clienteDAO.findByEmail(privacyEmail).isEmpty()); assertTrue(entrenadorDAO.findByEmail(privacyEmail).isEmpty());
        }
    }

    @Test
    void registroPersisteVersionYTimestampDeConsentimientos() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/register").contentType(MediaType.APPLICATION_JSON)
                .content(registrationJson("CLIENTE", "marketing-si@nextfit.test", true, true, true))).andExpect(status().isCreated()).andReturn();
        String token = new com.fasterxml.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString()).path("accessToken").asText();
        AuthenticatedUser user = jwtService.extractAuthenticatedUser(token);
        var consents = consentDAO.findByUserIdAndRole(user.userId(), user.role());
        org.junit.jupiter.api.Assertions.assertEquals(3, consents.size());
        assertTrue(consents.stream().allMatch(c -> c.isAccepted() && c.getAcceptedAt() != null && c.getVersion() != null));
        mockMvc.perform(get("/api/auth/consents").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.terms.accepted").value(true))
                .andExpect(jsonPath("$.privacy.accepted").value(true)).andExpect(jsonPath("$.marketing.accepted").value(true));
        mockMvc.perform(put("/api/auth/consents/marketing").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"accepted\":false}"))
                .andExpect(status().isNoContent());
        assertTrue(consentDAO.findByUserIdAndRoleAndType(user.userId(), user.role(), com.tuap.backend.dominio.entidades.ConsentType.MARKETING).orElseThrow().getWithdrawnAt() != null);
    }

    private void assertRegistration(String role, String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Nuevo\",\"apellido\":\"Usuario\",\"email\":\"" + email + "\",\"contrasena\":\"secreto\",\"rol\":\"" + role + "\",\"acceptTerms\":true,\"acceptPrivacy\":true,\"marketingConsent\":false}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").isNumber())
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.user.role").value(role))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.contrasena").doesNotExist())
                .andExpect(jsonPath("$.hash").doesNotExist())
                .andReturn();
        com.fasterxml.jackson.databind.JsonNode json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString());
        AuthenticatedUser user = jwtService.extractAuthenticatedUser(json.path("accessToken").asText());
        org.junit.jupiter.api.Assertions.assertEquals(json.path("user").path("id").asText(), user.userId().toString());
        org.junit.jupiter.api.Assertions.assertEquals(email, user.email());
        org.junit.jupiter.api.Assertions.assertEquals(Role.valueOf(role), user.role());
    }

    @Test
    void onboardingCliente_MatrizJwtYPropietario() throws Exception {
        String client = registerToken("CLIENTE", "onboarding-cliente-a@nextfit.test");
        String trainer = registerToken("ENTRENADOR", "onboarding-cliente-coach@nextfit.test");
        UUID clientId = jwtService.extractAuthenticatedUser(client).userId();
        mockMvc.perform(post("/api/clientes/onboarding").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/clientes/onboarding").header("Authorization", "Bearer " + trainer)
                .contentType(MediaType.APPLICATION_JSON).content("{}")) .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/clientes/onboarding").header("Authorization", "Bearer " + client)
                .contentType(MediaType.APPLICATION_JSON).content("{\"idCliente\":\"" + UUID.randomUUID() + "\"}")) .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/clientes/onboarding").header("Authorization", "Bearer " + client)
                .contentType(MediaType.APPLICATION_JSON).content("{\"idCliente\":\"" + clientId + "\",\"genero\":\"NO_DECIR\",\"objetivo\":\"FUERZA\",\"alturaCm\":170,\"pesoKg\":70}")) .andExpect(status().isOk());
    }

    @Test
    void onboardingEntrenador_MatrizJwtYPropietario() throws Exception {
        String trainer = registerToken("ENTRENADOR", "onboarding-entrenador-a@nextfit.test");
        String client = registerToken("CLIENTE", "onboarding-entrenador-cliente@nextfit.test");
        UUID trainerId = jwtService.extractAuthenticatedUser(trainer).userId();
        mockMvc.perform(post("/api/entrenador/onboarding").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/entrenador/onboarding").header("Authorization", "Bearer " + client)
                .contentType(MediaType.APPLICATION_JSON).content("{}")) .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/entrenador/onboarding").header("Authorization", "Bearer " + trainer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"idEntrenador\":\"" + UUID.randomUUID() + "\"}")) .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/entrenador/onboarding").header("Authorization", "Bearer " + trainer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"idEntrenador\":\"" + trainerId + "\",\"especialidad\":\"Fuerza\"}")) .andExpect(status().isOk());
    }

    private String registerToken(String role, String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Nuevo\",\"apellido\":\"Usuario\",\"email\":\"" + email + "\",\"contrasena\":\"secreto\",\"rol\":\"" + role + "\",\"acceptTerms\":true,\"acceptPrivacy\":true,\"marketingConsent\":false}"))
                .andExpect(status().isCreated()).andReturn();
        return new com.fasterxml.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString()).path("accessToken").asText();
    }

    private String registrationJson(String role, String email, boolean terms, boolean privacy, boolean marketing) {
        return "{\"nombre\":\"Nuevo\",\"apellido\":\"Usuario\",\"email\":\"" + email + "\",\"contrasena\":\"secreto\",\"rol\":\"" + role + "\",\"acceptTerms\":" + terms + ",\"acceptPrivacy\":" + privacy + ",\"marketingConsent\":" + marketing + "}";
    }

    private String expiredToken() {
        SecretKey key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(TEST_SECRET));
        Instant now = Instant.now();
        return Jwts.builder().subject(UUID.randomUUID().toString()).claim("role", "CLIENTE")
                .claim("email", "cliente@nextfit.test").issuer("nextfit-api-test")
                .audience().add("nextfit-clients-test").and().issuedAt(Date.from(now.minusSeconds(1000)))
                .expiration(Date.from(now.minusSeconds(120))).id(UUID.randomUUID().toString()).signWith(key).compact();
    }
}
