package com.tuap.backend.config;

import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.JwtService;

/** Authenticates STOMP CONNECT frames; the SockJS HTTP handshake remains transport-only. */
@Component
public class StompJwtChannelInterceptor implements ChannelInterceptor {
    private static final String USER_QUEUE = "/user/queue/mensajes";
    private final JwtService jwtService;

    public StompJwtChannelInterceptor(JwtService jwtService) { this.jwtService = jwtService; }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;
        StompCommand command = accessor.getCommand();
        if (command == StompCommand.CONNECT || command == StompCommand.STOMP) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) throw new IllegalArgumentException("JWT STOMP obligatorio");
            AuthenticatedUser user = jwtService.extractAuthenticatedUser(header.substring(7).trim());
            accessor.setUser(new StompAuthentication(user));
            return message;
        }
        if (accessor.getUser() == null) throw new IllegalArgumentException("Sesión STOMP no autenticada");
        if (command == StompCommand.SUBSCRIBE && !USER_QUEUE.equals(accessor.getDestination())) {
            throw new IllegalArgumentException("Destino STOMP no autorizado");
        }
        if (command == StompCommand.SEND && !"/app/chat".equals(accessor.getDestination())
                && !"/app/chat/leer".equals(accessor.getDestination())) {
            throw new IllegalArgumentException("Destino STOMP no autorizado");
        }
        return message;
    }

    private static final class StompAuthentication extends AbstractAuthenticationToken {
        private final AuthenticatedUser principal;
        StompAuthentication(AuthenticatedUser principal) {
            super(List.of(new SimpleGrantedAuthority(principal.role().toAuthority())));
            this.principal = principal;
            setAuthenticated(true);
        }
        @Override public Object getCredentials() { return null; }
        @Override public AuthenticatedUser getPrincipal() { return principal; }
        @Override public String getName() { return principal.userId().toString(); }
    }
}
