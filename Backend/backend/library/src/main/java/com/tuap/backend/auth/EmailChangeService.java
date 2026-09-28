package com.tuap.backend.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import java.security.SecureRandom; import java.time.*; import java.util.*; import org.springframework.stereotype.Service; import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.EmailChangeTokenDAO; import com.tuap.backend.persistencia.PasswordResetTokenDAO; import com.tuap.backend.dominio.entidades.EmailChangeToken;

@Service
public class EmailChangeService {
    private final ClienteDAO clientes; private final EntrenadorDAO entrenadores;
    private static final SecureRandom RANDOM=new SecureRandom(); private final PasswordEncoder passwords; private final RefreshTokenService refreshTokens; private EmailChangeTokenDAO tokens; private PasswordResetTokenDAO resets; private Optional<EmailChangeNotifier> notifier=Optional.empty(); private long ttl=30; private Clock clock=Clock.systemUTC();
    public EmailChangeService(ClienteDAO clientes, EntrenadorDAO entrenadores, PasswordEncoder passwords, RefreshTokenService refreshTokens) {
        this.clientes=clientes; this.entrenadores=entrenadores; this.passwords=passwords; this.refreshTokens=refreshTokens;
    }
    @Autowired public EmailChangeService(ClienteDAO c,EntrenadorDAO e,PasswordEncoder p,RefreshTokenService r,EmailChangeTokenDAO t,PasswordResetTokenDAO x,Optional<EmailChangeNotifier> n,@org.springframework.beans.factory.annotation.Value("${app.auth.email-change-ttl-minutes:30}") long minutes){clientes=c;entrenadores=e;passwords=p;refreshTokens=r;tokens=t;resets=x;notifier=n;ttl=minutes;}
    @Transactional public void request(AuthenticatedUser principal,String currentPassword,String requestedEmail){String email=normalizeAndValidate(requestedEmail); if(principal.role()==Role.CLIENTE){Cliente u=clientes.findById(principal.userId()).orElseThrow(InvalidCurrentPasswordException::new);validate(u.getContrasena(),u.getEmail(),currentPassword,email);}else{Entrenador u=entrenadores.findById(principal.userId()).orElseThrow(InvalidCurrentPasswordException::new);validate(u.getContrasena(),u.getEmail(),currentPassword,email);} if(IdentityResolver.normalizeEmail(principal.email()).equals(email))return; ensureFree(email); Instant now=clock.instant();tokens.findByUserIdAndRoleAndConsumedAtIsNull(principal.userId(),principal.role()).forEach(t->t.consume(now));byte[] bytes=new byte[32];RANDOM.nextBytes(bytes);String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);tokens.save(new EmailChangeToken(principal.userId(),principal.role(),email,PasswordResetService.hash(raw),now.plus(Duration.ofMinutes(ttl)),now));notifier.ifPresent(n->n.notifyChange(email,raw));}
    private void validate(String hash,String old,String current,String next){if(!passwords.matches(current==null?"":current,hash))throw new InvalidCurrentPasswordException();if(IdentityResolver.normalizeEmail(old).equals(next))return;}
    @Transactional public Result confirm(String raw,ClientType type){if(raw==null||raw.isBlank())throw new InvalidEmailChangeTokenException();Instant now=clock.instant();EmailChangeToken token=tokens.findByTokenHash(PasswordResetService.hash(raw)).orElseThrow(InvalidEmailChangeTokenException::new);if(!token.isUsableAt(now))throw new InvalidEmailChangeTokenException();ensureFree(token.getNewEmail());AuthenticatedUser user; if(token.getRole()==Role.CLIENTE){Cliente u=clientes.findById(token.getUserId()).filter(Cliente::isActive).orElseThrow(InvalidEmailChangeTokenException::new);u.setEmail(token.getNewEmail());clientes.save(u);user=new AuthenticatedUser(u.getId(),u.getEmail(),Role.CLIENTE);}else{Entrenador u=entrenadores.findById(token.getUserId()).filter(Entrenador::isActive).orElseThrow(InvalidEmailChangeTokenException::new);u.setEmail(token.getNewEmail());entrenadores.save(u);user=new AuthenticatedUser(u.getId(),u.getEmail(),Role.ENTRENADOR);}token.consume(now);tokens.findByUserIdAndRoleAndConsumedAtIsNull(user.userId(),user.role()).forEach(t->t.consume(now));refreshTokens.revokeAllForUser(user.userId(),user.role());if(resets!=null)resets.findByUserIdAndRoleAndUsedAtIsNull(user.userId(),user.role()).forEach(t->t.consume(now));return new Result(user,refreshTokens.issue(user,type));}
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
