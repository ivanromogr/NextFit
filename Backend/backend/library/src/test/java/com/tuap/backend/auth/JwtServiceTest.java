package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

class JwtServiceTest {

    private static final String SECRET = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
    private static final Instant NOW = Instant.parse("2026-01-15T12:00:00Z");

    private final ObjectMapper objectMapper = new ObjectMapper();
    private JwtProperties properties;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        properties = properties("nextfit-api", "nextfit-clients");
        jwtService = new JwtService(properties, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void generateAccessToken_ClienteIncluyeTodosLosClaimsFirmados() throws Exception {
        UUID id = UUID.randomUUID();
        String token = jwtService.generateAccessToken(new AuthenticatedUser(id, "cliente@nextfit.test", Role.CLIENTE));

        Map<String, Object> claims = payload(token);
        assertEquals(id.toString(), claims.get("sub"));
        assertEquals("CLIENTE", claims.get("role"));
        assertEquals("cliente@nextfit.test", claims.get("email"));
        assertEquals("nextfit-api", claims.get("iss"));
        assertEquals(java.util.List.of("nextfit-clients"), claims.get("aud"));
        assertEquals(NOW.getEpochSecond(), ((Number) claims.get("iat")).longValue());
        assertEquals(NOW.plusSeconds(900).getEpochSecond(), ((Number) claims.get("exp")).longValue());
        assertNotNull(claims.get("jti"));
        assertEquals("HS256", header(token).get("alg"));
        assertEquals(id, jwtService.extractAuthenticatedUser(token).userId());
    }

    @Test
    void generateAccessToken_EntrenadorConservaRolCanonico() {
        UUID id = UUID.randomUUID();
        String token = jwtService.generateAccessToken(new AuthenticatedUser(id, "entrenador@nextfit.test", Role.ENTRENADOR));

        AuthenticatedUser user = jwtService.extractAuthenticatedUser(token);

        assertEquals(id, user.userId());
        assertEquals("entrenador@nextfit.test", user.email());
        assertEquals(Role.ENTRENADOR, user.role());
    }

    @Test
    void extractAuthenticatedUser_RechazaFirmaConOtraClave() {
        JwtService otherKey = new JwtService(properties("nextfit-api", "nextfit-clients", "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg="), Clock.fixed(NOW, ZoneOffset.UTC));

        assertThrows(JwtValidationException.class, () -> otherKey.extractAuthenticatedUser(tokenForCliente()));
    }

    @Test
    void extractAuthenticatedUser_RechazaPayloadManipuladoEnClaimsCriticos() throws Exception {
        String token = tokenForCliente();
        for (String claim : java.util.List.of("sub", "role", "email")) {
            Map<String, Object> changed = new LinkedHashMap<>(payload(token));
            changed.put(claim, claim + "-manipulado");
            assertThrows(JwtValidationException.class, () -> jwtService.extractAuthenticatedUser(withPayload(token, changed)));
        }
    }

    @Test
    void extractAuthenticatedUser_RechazaTokenExpiradoDespuesDelSkew() {
        String token = tokenForCliente();
        JwtService afterExpiryAndSkew = new JwtService(properties, Clock.fixed(NOW.plusSeconds(961), ZoneOffset.UTC));

        assertThrows(JwtExpiredException.class, () -> afterExpiryAndSkew.extractAuthenticatedUser(token));
    }

    @Test
    void extractAuthenticatedUser_AceptaTokenDentroDelSkew() {
        String token = tokenForCliente();
        JwtService insideSkew = new JwtService(properties, Clock.fixed(NOW.plusSeconds(930), ZoneOffset.UTC));

        assertEquals(Role.CLIENTE, insideSkew.extractAuthenticatedUser(token).role());
    }

    @Test
    void extractAuthenticatedUser_RechazaIssuerOAudienceDistintos() {
        assertThrows(JwtValidationException.class, () -> new JwtService(properties("otro-issuer", "nextfit-clients"), Clock.fixed(NOW, ZoneOffset.UTC))
                .extractAuthenticatedUser(tokenForCliente()));
        assertThrows(JwtValidationException.class, () -> new JwtService(properties("nextfit-api", "otra-audiencia"), Clock.fixed(NOW, ZoneOffset.UTC))
                .extractAuthenticatedUser(tokenForCliente()));
    }

    @Test
    void extractAuthenticatedUser_RechazaClaimsIdentidadInvalidos() {
        assertThrows(JwtValidationException.class, () -> jwtService.extractAuthenticatedUser(signedToken("no-uuid", "CLIENTE", "cliente@nextfit.test")));
        assertThrows(JwtValidationException.class, () -> jwtService.extractAuthenticatedUser(signedToken(UUID.randomUUID().toString(), "ADMIN", "cliente@nextfit.test")));
        assertThrows(JwtValidationException.class, () -> jwtService.extractAuthenticatedUser(signedToken(UUID.randomUUID().toString(), "CLIENTE", null)));
    }

    @Test
    void extractAuthenticatedUser_RechazaTokenMalformado() {
        assertThrows(JwtValidationException.class, () -> jwtService.extractAuthenticatedUser("no-es-un-jwt"));
    }

    private String tokenForCliente() {
        return jwtService.generateAccessToken(new AuthenticatedUser(UUID.randomUUID(), "cliente@nextfit.test", Role.CLIENTE));
    }

    private String signedToken(String subject, String role, String email) {
        SecretKey key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(SECRET));
        var builder = Jwts.builder()
                .subject(subject)
                .claim("role", role)
                .issuer("nextfit-api")
                .audience().add("nextfit-clients").and()
                .issuedAt(java.util.Date.from(NOW))
                .expiration(java.util.Date.from(NOW.plusSeconds(900)))
                .id(UUID.randomUUID().toString());
        if (email != null) {
            builder.claim("email", email);
        }
        return builder.signWith(key).compact();
    }

    private JwtProperties properties(String issuer, String audience) {
        return properties(issuer, audience, SECRET);
    }

    private JwtProperties properties(String issuer, String audience, String secret) {
        JwtProperties result = new JwtProperties();
        result.setSecret(secret);
        result.setIssuer(issuer);
        result.setAudience(audience);
        result.setAccessTokenTtlSeconds(900);
        result.setClockSkewSeconds(60);
        result.validate();
        return result;
    }

    private Map<String, Object> header(String token) throws Exception {
        return decodePart(token.split("\\.")[0]);
    }

    private Map<String, Object> payload(String token) throws Exception {
        return decodePart(token.split("\\.")[1]);
    }

    private Map<String, Object> decodePart(String part) throws Exception {
        return objectMapper.readValue(Base64.getUrlDecoder().decode(part), new TypeReference<>() { });
    }

    private String withPayload(String token, Map<String, Object> payload) throws Exception {
        String[] parts = token.split("\\.");
        String changedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(objectMapper.writeValueAsString(payload).getBytes(StandardCharsets.UTF_8));
        return parts[0] + "." + changedPayload + "." + parts[2];
    }
}
