package com.tuap.backend.auth;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.UUID;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ClientProfileIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired ClienteDAO clientes;
    @Autowired EntrenadorDAO entrenadores;
    Cliente client;
    Entrenador coach;
    String clientToken, coachToken;

    @BeforeEach void setup() {
        coach = trainer();
        client = new Cliente();
        client.setNombre("Fixture athlete"); client.setApellido("Local");
        client.setEmail(UUID.randomUUID() + "@example.invalid");
        client.setRol("CLIENTE"); client.setObjetivo(""); client.setGenero("NO_DECIR");
        client.setContrasena("fixture-client-hash"); client.setEntrenador(coach);
        client = clientes.saveAndFlush(client);
        clientToken = token(client.getId(), client.getEmail(), Role.CLIENTE);
        coachToken = token(coach.getId(), coach.getEmail(), Role.ENTRENADOR);
    }
    Entrenador trainer() {
        var result = new Entrenador();
        result.setNombre("Fixture trainer"); result.setApellido("Local");
        result.setEmail(UUID.randomUUID() + "@example.invalid");
        result.setRol("ENTRENADOR"); result.setEspecialidad("Fuerza");
        result.setContrasena("fixture-coach-hash"); result.setFotoPerfil(null);
        return entrenadores.saveAndFlush(result);
    }
    String token(UUID id, String email, Role role) {
        return jwt.generateAccessToken(new AuthenticatedUser(id, email, role));
    }
    String path() { return "/api/clientes/" + client.getId(); }

    @Test void athleteCanLoadProfileWhenAssignedCoachHasNoPhoto() throws Exception {
        mvc.perform(get(path()).header("Authorization", "Bearer " + clientToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(client.getId().toString()))
            .andExpect(jsonPath("$.entrenador.id").value(coach.getId().toString()))
            .andExpect(jsonPath("$.entrenador.fotoPerfil").value(nullValue()));
    }
    @Test void assignedCoachCanLoadAthleteProfileWithoutPhoto() throws Exception {
        mvc.perform(get(path()).header("Authorization", "Bearer " + coachToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.entrenador.nombre").value("Fixture trainer"));
    }
    @Test void athleteWithoutCoachHasNoInventedTrainer() throws Exception {
        client.setEntrenador(null); clientes.saveAndFlush(client);
        mvc.perform(get(path()).header("Authorization", "Bearer " + clientToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.entrenador").doesNotExist());
    }
    @Test void photoUrlIsPreservedWithoutExposingCredentialsOrPrivateTrainerFields() throws Exception {
        coach.setFotoPerfil("https://media.example.invalid/avatar.png");
        entrenadores.saveAndFlush(coach);
        mvc.perform(get(path()).header("Authorization", "Bearer " + clientToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.entrenador.fotoPerfil").value("https://media.example.invalid/avatar.png"))
            .andExpect(jsonPath("$.contrasena").doesNotExist())
            .andExpect(jsonPath("$.entrenador.contrasena").doesNotExist())
            .andExpect(jsonPath("$.entrenador.email").doesNotExist());
    }
    @Test void unrelatedAccountsCannotReadTheProfile() throws Exception {
        var unrelatedCoach = trainer();
        mvc.perform(get(path()).header("Authorization", "Bearer " + token(unrelatedCoach.getId(), unrelatedCoach.getEmail(), Role.ENTRENADOR)))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        var other = new Cliente();
        other.setNombre("Other fixture"); other.setApellido("Local"); other.setEmail(UUID.randomUUID() + "@example.invalid");
        other.setRol("CLIENTE"); other.setObjetivo(""); other.setGenero("NO_DECIR");
        other = clientes.saveAndFlush(other);
        mvc.perform(get(path()).header("Authorization", "Bearer " + token(other.getId(), other.getEmail(), Role.CLIENTE)))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }
    @Test void anonymousRequestIsRejected() throws Exception {
        mvc.perform(get(path())).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("MISSING_TOKEN"));
    }
}
