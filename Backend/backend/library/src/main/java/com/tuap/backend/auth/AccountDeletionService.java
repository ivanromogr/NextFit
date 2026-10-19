package com.tuap.backend.auth;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.PasswordResetTokenDAO;
import com.tuap.backend.servicios.ProfileImageService;

@Service public class AccountDeletionService {
  private final ClienteDAO clientes; private final EntrenadorDAO entrenadores; private final PasswordResetTokenDAO resets; private final RefreshTokenService refresh; private final PasswordEncoder passwords; private final ProfileImageService profileImages; private final Clock clock;
  @org.springframework.beans.factory.annotation.Autowired(required=false) private AuthIdentityService authIdentities;
  @org.springframework.beans.factory.annotation.Autowired private com.tuap.backend.persistencia.AuthIdentityDAO identities;
  @org.springframework.beans.factory.annotation.Autowired public AccountDeletionService(ClienteDAO c, EntrenadorDAO e, PasswordResetTokenDAO r, RefreshTokenService f, PasswordEncoder p, ProfileImageService images) { this(c,e,r,f,p,images,Clock.systemUTC()); }
  AccountDeletionService(ClienteDAO c, EntrenadorDAO e, PasswordResetTokenDAO r, RefreshTokenService f, PasswordEncoder p, ProfileImageService images, Clock clock) { clientes=c; entrenadores=e; resets=r; refresh=f; passwords=p; profileImages=images; this.clock=clock; }
  @Transactional public void delete(AuthenticatedUser user, String currentPassword) {
    performDeletion(user, currentPassword, false);
  }
  @Transactional public void deleteWithSocialIdentity(AuthenticatedUser user, VerifiedSocialIdentity verified) {
    if (verified == null || (verified.provider() != AuthProvider.GOOGLE && verified.provider() != AuthProvider.APPLE)) throw new InvalidReauthenticationTokenException();
    boolean owned = identities.lockActiveByUserIdAndRole(user.userId(), user.role()).stream()
        .anyMatch(i -> i.isActive() && i.getUserId().equals(user.userId()) && i.getRole() == user.role()
            && i.getProvider() == verified.provider() && i.getProviderSubject().equals(verified.providerSubject()));
    if (!owned) throw new InvalidReauthenticationTokenException();
    performDeletion(user, null, true);
  }
  private void performDeletion(AuthenticatedUser user, String currentPassword, boolean socialVerified) {
    if (!socialVerified && currentPassword == null) throw new InvalidCurrentPasswordException(); Instant now=clock.instant();
    if (user.role()==Role.CLIENTE) { Cliente c=clientes.findById(user.userId()).orElseThrow(InvalidCurrentPasswordException::new); if(!c.isActive() || (!socialVerified && (c.getContrasena()==null || !passwords.matches(currentPassword,c.getContrasena())))) throw new InvalidCurrentPasswordException(); profileImages.removeForAccountDeletion(user); anonymize(c,user.userId(),now); clientes.save(c); }
    else { Entrenador e=entrenadores.findById(user.userId()).orElseThrow(InvalidCurrentPasswordException::new); if(!e.isActive() || (!socialVerified && (e.getContrasena()==null || !passwords.matches(currentPassword,e.getContrasena())))) throw new InvalidCurrentPasswordException(); profileImages.removeForAccountDeletion(user); clientes.findByEntrenadorId(user.userId()).forEach(c->{c.setEntrenador(null); clientes.save(c);}); anonymize(e,user.userId(),now); entrenadores.save(e); }
    resets.findByUserIdAndRoleAndUsedAtIsNull(user.userId(),user.role()).forEach(t->t.consume(now)); refresh.revokeAllForUser(user.userId(),user.role()); if(authIdentities!=null)authIdentities.deactivateAll(user);
  }
  private void anonymize(Cliente c, UUID id, Instant now) { c.setActive(false); c.setDeletedAt(now); c.setEntrenador(null); c.setNombre("Cuenta eliminada"); c.setApellido(""); c.setEmail("deleted+"+id+"@nextfit.invalid"); c.setFotoPerfil(null); c.setObjetivo(""); c.setGenero("NO_DECIR"); c.setPeso(0); c.setAltura(0); c.setEdad(0); c.setContrasena(passwords.encode(UUID.randomUUID().toString())); }
  private void anonymize(Entrenador e, UUID id, Instant now) { e.setActive(false); e.setDeletedAt(now); e.setNombre("Cuenta eliminada"); e.setApellido(""); e.setEmail("deleted+"+id+"@nextfit.invalid"); e.setFotoPerfil(null); e.setPerfilPublico(false); e.setDescripcionPerfil(null); e.setBiografia(null); e.setContrasena(passwords.encode(UUID.randomUUID().toString())); }
}
