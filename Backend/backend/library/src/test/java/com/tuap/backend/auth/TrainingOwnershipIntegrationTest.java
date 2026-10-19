package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuap.backend.dominio.entidades.*;
import com.tuap.backend.persistencia.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/** Real JWT, services and persistence; all accounts are synthetic and rolled back. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TrainingOwnershipIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JwtService jwt;
    @Autowired ClienteDAO clientes;
    @Autowired EntrenadorDAO entrenadores;
    @Autowired RutinaDAO rutinas;
    @Autowired EventoCalendarioDAO eventos;
    @Autowired SesionEntrenamientoDAO sesiones;
    Cliente a, b;
    Entrenador entrenador;
    Rutina rutinaA, rutinaB;
    EventoCalendario eventoA, eventoB;
    String tokenA, tokenEntrenador;

    @BeforeEach void preparar() {
        entrenador = new Entrenador();
        entrenador.setNombre("Entrenador"); entrenador.setApellido("Prueba");
        entrenador.setEmail(UUID.randomUUID() + "@nextfit.test");
        entrenador.setRol("ENTRENADOR"); entrenador.setEspecialidad("Fuerza");
        entrenador = entrenadores.saveAndFlush(entrenador);
        a = cliente(); b = cliente(); rutinaA = rutina(a); rutinaB = rutina(b);
        eventoA = eventos.saveAndFlush(new EventoCalendario(LocalDate.now(), rutinaA, a));
        eventoB = eventos.saveAndFlush(new EventoCalendario(LocalDate.now(), rutinaB, b));
        tokenA = jwt.generateAccessToken(new AuthenticatedUser(a.getId(), a.getEmail(), Role.CLIENTE));
        tokenEntrenador = jwt.generateAccessToken(new AuthenticatedUser(entrenador.getId(), entrenador.getEmail(), Role.ENTRENADOR));
    }

    @Test void entrenadorNoMezclaClientesAunqueTengaAccesoAAmbos() throws Exception {
        long antes = eventos.count();
        programar(rutinaB).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        assertEquals(antes, eventos.count());
    }
    @Test void entrenadorPuedeProgramarLaRutinaDelClienteCorrecto() throws Exception {
        long antes = eventos.count(); programar(rutinaA).andExpect(status().isOk());
        assertEquals(antes + 1, eventos.count());
    }
    @Test void plantillaDebeClonarseAntesDeProgramar() throws Exception {
        Rutina plantilla = rutina(null); plantilla.setEsPlantilla(true); rutinas.saveAndFlush(plantilla);
        long antes = eventos.count(); programar(plantilla).andExpect(status().isForbidden());
        assertEquals(antes, eventos.count());
    }
    @Test void eventoAjenoNoSeMarcaConUnaSesionPropia() throws Exception {
        rechazar(rutinaA.getId(), eventoB.getId());
        assertFalse(eventos.findById(eventoB.getId()).orElseThrow().isCompletado());
    }
    @Test void eventoAjenoConSesionPreviaNoFiltraSuIdentificador() throws Exception {
        SesionEntrenamiento privada = previa(b, rutinaB, eventoB);
        rechazar(rutinaA.getId(), eventoB.getId());
        assertEquals(b.getId(), sesiones.findById(privada.getId()).orElseThrow().getCliente().getId());
    }
    @Test void eventoPropioDeOtraRutinaSeRechaza() throws Exception {
        Rutina otra = rutina(a);
        EventoCalendario evento = eventos.saveAndFlush(new EventoCalendario(LocalDate.now(), otra, a));
        rechazar(rutinaA.getId(), evento.getId()); assertFalse(evento.isCompletado());
    }
    @Test void eventoInexistenteNoDejaSesionParcial() throws Exception {
        rechazar(rutinaA.getId(), UUID.randomUUID());
    }
    @Test void eventoSinRutinaNoEsEntrenamientoLibre() throws Exception {
        long antes = sesiones.count();
        guardar(Map.of("eventoCalendarioId", eventoA.getId(), "duracionSegundos", 120))
                .andExpect(status().isForbidden());
        assertEquals(antes, sesiones.count()); assertFalse(eventoA.isCompletado());
    }
    @Test void sesionPreviaInconsistenteNoSeDevuelveConEventoPropio() throws Exception {
        previa(b, rutinaB, eventoA); rechazar(rutinaA.getId(), eventoA.getId());
    }
    @Test void sesionPropiaYReintentoDevuelvenElMismoResultado() throws Exception {
        long antes = sesiones.count();
        var payload = payload(rutinaA.getId(), eventoA.getId());
        var respuesta = guardar(payload).andExpect(status().isOk()).andReturn().getResponse();
        String id = json.readTree(respuesta.getContentAsString()).get("id").asText();
        guardar(payload).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
        assertEquals(antes + 1, sesiones.count());
        assertTrue(eventos.findById(eventoA.getId()).orElseThrow().isCompletado());
        assertFalse(eventos.findById(eventoB.getId()).orElseThrow().isCompletado());
    }
    @Test void entrenamientoLibreSinEventoSigueDisponible() throws Exception {
        long antes = sesiones.count(); guardar(Map.of("duracionSegundos", 120))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nombre").value("Entrenamiento Libre"));
        assertEquals(antes + 1, sesiones.count()); assertFalse(eventoA.isCompletado());
    }
    private void rechazar(UUID rutinaId, UUID eventoId) throws Exception {
        long antes = sesiones.count(); guardar(payload(rutinaId, eventoId))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        assertEquals(antes, sesiones.count());
    }
    private Map<String, Object> payload(UUID rutinaId, UUID eventoId) {
        return Map.of("rutinaId", rutinaId, "eventoCalendarioId", eventoId, "duracionSegundos", 120);
    }
    private ResultActions guardar(Map<String, ?> payload) throws Exception {
        return mvc.perform(post("/api/sesiones").header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload)));
    }
    private ResultActions programar(Rutina r) throws Exception {
        return mvc.perform(post("/api/calendario/" + a.getId()).header("Authorization", "Bearer " + tokenEntrenador)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "rutinaId", r.getId(), "fecha", LocalDate.now().plusDays(1).toString()))));
    }
    private Cliente cliente() {
        Cliente c = new Cliente(); c.setNombre("Cliente"); c.setApellido("Prueba");
        c.setEmail(UUID.randomUUID() + "@nextfit.test"); c.setRol("CLIENTE");
        c.setObjetivo("Fuerza"); c.setGenero("NO_DECIR"); c.setEntrenador(entrenador);
        return clientes.saveAndFlush(c);
    }
    private Rutina rutina(Cliente c) {
        Rutina r = new Rutina(); r.setCliente(c); r.setNombre("Rutina de prueba");
        r.setCreador("ENTRENADOR"); r.setEntrenadorId(entrenador.getId()); return rutinas.saveAndFlush(r);
    }
    private SesionEntrenamiento previa(Cliente c, Rutina r, EventoCalendario e) {
        SesionEntrenamiento s = new SesionEntrenamiento(); s.setCliente(c); s.setRutina(r);
        s.setEventoCalendario(e); s.setFechaHora(LocalDateTime.now()); return sesiones.saveAndFlush(s);
    }
}
