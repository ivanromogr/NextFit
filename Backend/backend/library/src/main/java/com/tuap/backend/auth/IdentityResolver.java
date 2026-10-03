package com.tuap.backend.auth;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

/** Single boundary for resolving the two persisted identity types. */
@Service
public class IdentityResolver {

    private final ClienteDAO clienteDAO;
    private final EntrenadorDAO entrenadorDAO;

    public IdentityResolver(ClienteDAO clienteDAO, EntrenadorDAO entrenadorDAO) {
        this.clienteDAO = clienteDAO;
        this.entrenadorDAO = entrenadorDAO;
    }

    public Optional<AuthenticatableIdentity> findByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        Optional<Cliente> cliente = clienteDAO.findByEmail(normalizedEmail);
        Optional<Entrenador> entrenador = entrenadorDAO.findByEmail(normalizedEmail);

        if (cliente.isPresent() && entrenador.isPresent()) {
            throw new AmbiguousIdentityException();
        }
        if (cliente.isPresent() && cliente.get().isActive()) {
            return cliente.map(this::fromCliente);
        }
        return entrenador.filter(Entrenador::isActive).map(this::fromEntrenador);
    }

    public Optional<AuthenticatedUser> findByIdAndRole(UUID userId, Role role) {
        if (userId == null || role == null) {
            return Optional.empty();
        }
        return switch (role) {
            case CLIENTE -> clienteDAO.findById(userId).filter(Cliente::isActive)
                    .map(c -> new AuthenticatedUser(c.getId(), normalizeEmail(c.getEmail()), Role.fromStoredValue(c.getRol())));
            case ENTRENADOR -> entrenadorDAO.findById(userId).filter(Entrenador::isActive)
                    .map(e -> new AuthenticatedUser(e.getId(), normalizeEmail(e.getEmail()), Role.fromStoredValue(e.getRol())));
        };
    }

    public static String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("El email es obligatorio");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private AuthenticatableIdentity fromCliente(Cliente cliente) {
        return new AuthenticatableIdentity(cliente.getId(), normalizeEmail(cliente.getEmail()),
                Role.fromStoredValue(cliente.getRol()), cliente.getContrasena());
    }

    private AuthenticatableIdentity fromEntrenador(Entrenador entrenador) {
        return new AuthenticatableIdentity(entrenador.getId(), normalizeEmail(entrenador.getEmail()),
                Role.fromStoredValue(entrenador.getRol()), entrenador.getContrasena());
    }
}
