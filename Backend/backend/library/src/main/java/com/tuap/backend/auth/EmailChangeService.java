package com.tuap.backend.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

@Service
public class EmailChangeService {
    private final ClienteDAO clientes; private final EntrenadorDAO entrenadores;
    private final PasswordEncoder passwords; private final RefreshTokenService refreshTokens;
    public EmailChangeService(ClienteDAO clientes, EntrenadorDAO entrenadores, PasswordEncoder passwords, RefreshTokenService refreshTokens) {
        this.clientes=clientes; this.entrenadores=entrenadores; this.passwords=passwords; this.refreshTokens=refreshTokens;
    }
    @Transactional
    public Result change(AuthenticatedUser principal, String currentPassword, String requestedEmail, ClientType clientType) {
        String email = normalizeAndValidate(requestedEmail);
        return switch (principal.role()) {
            case CLIENTE -> changeCliente(principal, currentPassword, email, clientType);
            case ENTRENADOR -> changeEntrenador(principal, currentPassword, email, clientType);
        };
    }
    private Result changeCliente(AuthenticatedUser p, String currentPassword, String email, ClientType type) {
        Cliente user=clientes.findById(p.userId()).orElseThrow(InvalidCurrentPasswordException::new);
        if (!passwords.matches(currentPassword == null ? "" : currentPassword, user.getContrasena())) throw new InvalidCurrentPasswordException();
        if (IdentityResolver.normalizeEmail(user.getEmail()).equals(email)) return new Result(new AuthenticatedUser(user.getId(), email, Role.CLIENTE), null);
        ensureFree(email); user.setEmail(email); clientes.save(user); refreshTokens.revokeAllForUser(user.getId(), Role.CLIENTE);
        return new Result(new AuthenticatedUser(user.getId(), email, Role.CLIENTE), refreshTokens.issue(new AuthenticatedUser(user.getId(), email, Role.CLIENTE), type));
    }
    private Result changeEntrenador(AuthenticatedUser p, String currentPassword, String email, ClientType type) {
        Entrenador user=entrenadores.findById(p.userId()).orElseThrow(InvalidCurrentPasswordException::new);
        if (!passwords.matches(currentPassword == null ? "" : currentPassword, user.getContrasena())) throw new InvalidCurrentPasswordException();
        if (IdentityResolver.normalizeEmail(user.getEmail()).equals(email)) return new Result(new AuthenticatedUser(user.getId(), email, Role.ENTRENADOR), null);
        ensureFree(email); user.setEmail(email); entrenadores.save(user); refreshTokens.revokeAllForUser(user.getId(), Role.ENTRENADOR);
        return new Result(new AuthenticatedUser(user.getId(), email, Role.ENTRENADOR), refreshTokens.issue(new AuthenticatedUser(user.getId(), email, Role.ENTRENADOR), type));
    }
    private void ensureFree(String email) { if (clientes.findByEmail(email).isPresent() || entrenadores.findByEmail(email).isPresent()) throw new EmailAlreadyInUseException(); }
    public static String normalizeAndValidate(String value) {
        String email;
        try { email=IdentityResolver.normalizeEmail(value); } catch (IllegalArgumentException e) { throw new InvalidEmailException(); }
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw new InvalidEmailException();
        return email;
    }
    public record Result(AuthenticatedUser user, RefreshTokenService.IssuedToken refresh) { public boolean changed() { return refresh != null; } }
}
