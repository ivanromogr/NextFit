package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

class EmailChangeServiceTest {
  @Test void clienteNormalizaRevocaYEmiteSesion() {
    ClienteDAO clientes=mock(ClienteDAO.class); EntrenadorDAO entrenadores=mock(EntrenadorDAO.class); PasswordEncoder passwords=mock(PasswordEncoder.class); RefreshTokenService refresh=mock(RefreshTokenService.class);
    UUID id=UUID.randomUUID(); Cliente cliente=new Cliente(); cliente.setId(id); cliente.setEmail("old@example.com"); cliente.setContrasena("hash");
    when(clientes.findById(id)).thenReturn(Optional.of(cliente)); when(passwords.matches("correcta", "hash")).thenReturn(true); when(clientes.findByEmail("new.email@example.com")).thenReturn(Optional.empty()); when(entrenadores.findByEmail("new.email@example.com")).thenReturn(Optional.empty()); when(refresh.issue(any(), eq(ClientType.MOBILE))).thenReturn(new RefreshTokenService.IssuedToken("new-refresh","hash",UUID.randomUUID(),java.time.Instant.now()));
    var result=new EmailChangeService(clientes,entrenadores,passwords,refresh).change(new AuthenticatedUser(id,"old@example.com",Role.CLIENTE),"correcta"," New.Email@Example.COM ",ClientType.MOBILE);
    assertEquals("new.email@example.com",cliente.getEmail()); assertEquals("new.email@example.com",result.user().email()); assertTrue(result.changed()); verify(refresh).revokeAllForUser(id,Role.CLIENTE);
  }
  @Test void rechazaDuplicadoCrossTableYNoOpNoRevoca() {
    ClienteDAO clientes=mock(ClienteDAO.class); EntrenadorDAO entrenadores=mock(EntrenadorDAO.class); PasswordEncoder passwords=mock(PasswordEncoder.class); RefreshTokenService refresh=mock(RefreshTokenService.class); UUID id=UUID.randomUUID(); Cliente cliente=new Cliente(); cliente.setId(id); cliente.setEmail("same@example.com"); cliente.setContrasena("hash"); when(clientes.findById(id)).thenReturn(Optional.of(cliente)); when(passwords.matches(anyString(),eq("hash"))).thenReturn(true);
    var service=new EmailChangeService(clientes,entrenadores,passwords,refresh); assertFalse(service.change(new AuthenticatedUser(id,"same@example.com",Role.CLIENTE),"ok"," SAME@example.com ",ClientType.WEB).changed()); verifyNoInteractions(refresh);
    Cliente other=new Cliente(); other.setId(UUID.randomUUID()); other.setEmail("other@example.com"); when(clientes.findByEmail("other@example.com")).thenReturn(Optional.empty()); Entrenador trainer=new Entrenador(); trainer.setEmail("other@example.com"); when(entrenadores.findByEmail("other@example.com")).thenReturn(Optional.of(trainer)); assertThrows(EmailAlreadyInUseException.class,()->service.change(new AuthenticatedUser(id,"same@example.com",Role.CLIENTE),"ok","other@example.com",ClientType.WEB));
  }
}
