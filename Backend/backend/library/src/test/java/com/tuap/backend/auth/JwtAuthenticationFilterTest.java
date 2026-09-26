package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {
    @Mock private JwtService jwtService;
    @Mock private JwtAuthenticationEntryPoint entryPoint;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() { filter = new JwtAuthenticationFilter(jwtService, entryPoint); }
    @AfterEach
    void clearContext() { SecurityContextHolder.clearContext(); }

    @Test
    void bearerClienteValido_CreaPrincipalYAuthority() throws Exception {
        AuthenticatedUser user = new AuthenticatedUser(UUID.randomUUID(), "cliente@nextfit.test", Role.CLIENTE);
        when(jwtService.extractAuthenticatedUser("token")).thenReturn(user);

        filter.doFilter(new MockHttpServletRequest() {{ addHeader("Authorization", "Bearer token"); }},
                new MockHttpServletResponse(), new MockFilterChain());

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertEquals(user, authentication.getPrincipal());
        assertEquals("ROLE_CLIENTE", authentication.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void bearerEntrenadorValido_CreaAuthorityCorrecta() throws Exception {
        AuthenticatedUser user = new AuthenticatedUser(UUID.randomUUID(), "entrenador@nextfit.test", Role.ENTRENADOR);
        when(jwtService.extractAuthenticatedUser("token")).thenReturn(user);

        filter.doFilter(new MockHttpServletRequest() {{ addHeader("Authorization", "Bearer token"); }},
                new MockHttpServletResponse(), new MockFilterChain());

        assertEquals("ROLE_ENTRENADOR", SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void sinAuthorizationOConEsquemaDistinto_ContinuaAnonimo() throws Exception {
        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        MockHttpServletRequest basic = new MockHttpServletRequest();
        basic.addHeader("Authorization", "Basic abc");
        filter.doFilter(basic, new MockHttpServletResponse(), new MockFilterChain());
        verify(jwtService, never()).extractAuthenticatedUser(any());
    }

    @Test
    void tokenInvalidoOExpirado_DeleganEnEntryPoint() throws Exception {
        MockHttpServletRequest invalid = new MockHttpServletRequest();
        invalid.addHeader("Authorization", "Bearer invalido");
        when(jwtService.extractAuthenticatedUser("invalido")).thenThrow(new JwtValidationException("invalido"));
        filter.doFilter(invalid, new MockHttpServletResponse(), new MockFilterChain());
        assertEquals("INVALID_TOKEN", invalid.getAttribute("nextfit.jwt.error"));

        MockHttpServletRequest expired = new MockHttpServletRequest();
        expired.addHeader("Authorization", "Bearer expirado");
        when(jwtService.extractAuthenticatedUser("expirado")).thenThrow(new JwtExpiredException());
        filter.doFilter(expired, new MockHttpServletResponse(), new MockFilterChain());
        assertEquals("TOKEN_EXPIRED", expired.getAttribute("nextfit.jwt.error"));
        verify(entryPoint, org.mockito.Mockito.times(2)).commence(any(), any(), any());
    }

    @Test
    void securityContextExistente_NoSeSobrescribe() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("existente", null, java.util.List.of()));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertEquals("existente", SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        verify(jwtService, never()).extractAuthenticatedUser(any());
    }
}
