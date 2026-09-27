package com.tuap.backend.auth;

import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

/** Centralizes ownership checks; request IDs are selectors, never authority. */
@Service
public class OwnershipService {
    private static final String DENIED = "No tienes permisos para realizar esta acción";
    private final ClienteDAO clienteDAO;
    private final EntrenadorDAO entrenadorDAO;

    public OwnershipService(ClienteDAO clienteDAO) { this(clienteDAO, null); }

    @org.springframework.beans.factory.annotation.Autowired
    public OwnershipService(ClienteDAO clienteDAO, EntrenadorDAO entrenadorDAO) {
        this.clienteDAO = clienteDAO;
        this.entrenadorDAO = entrenadorDAO;
    }

    public void requireSelf(UUID targetId, AuthenticatedUser user, Role role) {
        if (user == null || user.role() != role || !user.userId().equals(targetId)) deny();
    }

    public void requireRole(AuthenticatedUser user, Role role) {
        if (user == null || user.role() != role) deny();
    }

    public void requireClientAccess(UUID clienteId, AuthenticatedUser user) {
        if (user == null) deny();
        if (user.role() == Role.CLIENTE && user.userId().equals(clienteId)) return;
        if (user.role() == Role.ENTRENADOR && isAssignedTrainer(clienteId, user.userId())) return;
        deny();
    }

    public void requireTrainerAssignedClient(UUID clienteId, AuthenticatedUser user) {
        if (user == null || user.role() != Role.ENTRENADOR || !isAssignedTrainer(clienteId, user.userId())) deny();
    }

    public boolean isAssignedTrainer(UUID clienteId, UUID entrenadorId) {
        return clienteDAO.findById(clienteId)
                .map(Cliente::getEntrenador)
                .map(entrenador -> entrenador.getId().equals(entrenadorId))
                .orElse(false);
    }

    /** Chat is limited to the current cliente-entrenador relationship. */
    public void requireCanChatWith(AuthenticatedUser user, UUID otherUserId) {
        if (user == null || otherUserId == null || entrenadorDAO == null) deny();
        if (user.role() == Role.CLIENTE) {
            boolean allowed = clienteDAO.findById(user.userId()).filter(Cliente::isActive).isPresent()
                    && entrenadorDAO.findById(otherUserId).filter(e -> e.isActive()).isPresent()
                    && isAssignedTrainer(user.userId(), otherUserId);
            if (allowed) return;
            deny();
        }
        if (user.role() == Role.ENTRENADOR) {
            if (entrenadorDAO.findById(user.userId()).filter(e -> e.isActive()).isPresent() && clienteDAO.findById(otherUserId).filter(Cliente::isActive)
                    .map(Cliente::getEntrenador)
                    .map(entrenador -> entrenador.getId().equals(user.userId()))
                    .orElse(false)) return;
            deny();
        }
        deny();
    }

    /** A trainer may change only resources they created for a currently assigned client. */
    public void requireRoutineAccess(Rutina rutina, AuthenticatedUser user) {
        if (rutina == null || user == null) deny();
        if (user.role() == Role.CLIENTE) {
            if (rutina.getCliente() != null && user.userId().equals(rutina.getCliente().getId())) return;
            deny();
        }
        if (user.role() == Role.ENTRENADOR
                && user.userId().equals(rutina.getEntrenadorId())
                && (rutina.isEsPlantilla() || (rutina.getCliente() != null
                    && isAssignedTrainer(rutina.getCliente().getId(), user.userId())))) return;
        deny();
    }

    private void deny() { throw new AccessDeniedException(DENIED); }
}
