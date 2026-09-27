package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.PasswordResetTokenDAO;
import com.tuap.backend.servicios.ProfileImageService;

class AccountDeletionServiceTest {
    @Test void clienteConFotoGestionada_LimpiaFotoAntesDeAnonimizar() {
        UUID id = UUID.randomUUID(); Cliente cliente = cliente(id, "/api/upload/files/" + UUID.randomUUID());
        ClienteDAO clientes = mock(ClienteDAO.class); when(clientes.findById(id)).thenReturn(Optional.of(cliente));
        ProfileImageService images = mock(ProfileImageService.class); AccountDeletionService service = service(clientes, mock(EntrenadorDAO.class), images);
        service.delete(user(id, Role.CLIENTE), "correcta");
        verify(images).removeForAccountDeletion(user(id, Role.CLIENTE)); assertNull(cliente.getFotoPerfil()); assertFalse(cliente.isActive());
    }
    @Test void entrenadorConFotoGestionada_LimpiaFotoYDesvinculaClientes() {
        UUID id = UUID.randomUUID(); Entrenador entrenador = new Entrenador(); entrenador.setId(id); entrenador.setActive(true); entrenador.setContrasena("hash"); entrenador.setFotoPerfil("/api/upload/files/" + UUID.randomUUID());
        EntrenadorDAO entrenadores = mock(EntrenadorDAO.class); when(entrenadores.findById(id)).thenReturn(Optional.of(entrenador)); ClienteDAO clientes = mock(ClienteDAO.class); when(clientes.findByEntrenadorId(id)).thenReturn(List.of()); ProfileImageService images = mock(ProfileImageService.class);
        service(clientes, entrenadores, images).delete(user(id, Role.ENTRENADOR), "correcta");
        verify(images).removeForAccountDeletion(user(id, Role.ENTRENADOR)); assertNull(entrenador.getFotoPerfil()); assertFalse(entrenador.isActive());
    }
    @Test void fotoLegacyYSinFoto_SeDesreferencianSinTocarAdjuntosDeChat() {
        UUID id = UUID.randomUUID(); Cliente cliente = cliente(id, "https://legacy.example/foto.jpg"); ClienteDAO clientes = mock(ClienteDAO.class); when(clientes.findById(id)).thenReturn(Optional.of(cliente)); ProfileImageService images = mock(ProfileImageService.class);
        service(clientes, mock(EntrenadorDAO.class), images).delete(user(id, Role.CLIENTE), "correcta");
        verify(images).removeForAccountDeletion(user(id, Role.CLIENTE)); assertNull(cliente.getFotoPerfil());
    }
    private AccountDeletionService service(ClienteDAO c, EntrenadorDAO e, ProfileImageService images) { PasswordResetTokenDAO resets=mock(PasswordResetTokenDAO.class); when(resets.findByUserIdAndRoleAndUsedAtIsNull(any(),any())).thenReturn(List.of()); RefreshTokenService refresh=mock(RefreshTokenService.class); PasswordEncoder passwords=mock(PasswordEncoder.class); when(passwords.matches(any(),any())).thenReturn(true); when(passwords.encode(any())).thenReturn("new-hash"); return new AccountDeletionService(c,e,resets,refresh,passwords,images,Clock.systemUTC()); }
    private Cliente cliente(UUID id, String photo) { Cliente c=new Cliente(); c.setId(id); c.setActive(true); c.setContrasena("hash"); c.setFotoPerfil(photo); return c; }
    private AuthenticatedUser user(UUID id, Role role) { return new AuthenticatedUser(id,"user@test",role); }
}
