package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.persistencia.ClienteDAO;

@ExtendWith(MockitoExtension.class)
class OwnershipServiceTest {
    @Mock private ClienteDAO clienteDAO;

    @Test
    void clientCannotUseAnotherClientId() {
        OwnershipService service = new OwnershipService(clienteDAO);
        assertThrows(AccessDeniedException.class, () -> service.requireClientAccess(UUID.randomUUID(),
                new AuthenticatedUser(UUID.randomUUID(), "a@test", Role.CLIENTE)));
    }

    @Test
    void trainerAccessDependsOnCurrentDatabaseAssignment() {
        UUID trainerId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        Cliente client = new Cliente();
        Entrenador trainer = new Entrenador();
        trainer.setId(trainerId);
        client.setEntrenador(trainer);
        when(clienteDAO.findById(clientId)).thenReturn(Optional.of(client));

        OwnershipService service = new OwnershipService(clienteDAO);
        AuthenticatedUser trainerPrincipal = new AuthenticatedUser(trainerId, "t@test", Role.ENTRENADOR);
        assertDoesNotThrow(() -> service.requireClientAccess(clientId, trainerPrincipal));

        client.setEntrenador(null);
        assertThrows(AccessDeniedException.class, () -> service.requireClientAccess(clientId, trainerPrincipal));
    }
}
