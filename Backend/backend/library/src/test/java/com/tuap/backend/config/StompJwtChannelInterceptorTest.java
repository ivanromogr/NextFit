package com.tuap.backend.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.core.Authentication;

import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.JwtService;
import com.tuap.backend.auth.Role;

@ExtendWith(MockitoExtension.class)
class StompJwtChannelInterceptorTest {
    @Mock private JwtService jwtService;
    @Mock private MessageChannel channel;

    @Test
    void connectValidJwtSetsTheSameAuthenticatedUserPrincipal() {
        AuthenticatedUser user = new AuthenticatedUser(UUID.randomUUID(), "cliente@test", Role.CLIENTE);
        when(jwtService.extractAuthenticatedUser("valid")).thenReturn(user);
        Message<?> result = interceptor().preSend(frame(StompCommand.CONNECT, null, "Bearer valid"), channel);
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        Authentication authentication = (Authentication) accessor.getUser();
        assertEquals(user, authentication.getPrincipal());
        assertEquals(user.userId().toString(), authentication.getName());
    }

    @Test
    void connectWithoutJwtAndInvalidOrExpiredJwtAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> interceptor().preSend(frame(StompCommand.CONNECT, null, null), channel));
        when(jwtService.extractAuthenticatedUser("invalid")).thenThrow(new IllegalArgumentException("invalid"));
        assertThrows(IllegalArgumentException.class, () -> interceptor().preSend(frame(StompCommand.CONNECT, null, "Bearer invalid"), channel));
    }

    @Test
    void onlyPrivateMessageQueueCanBeSubscribed() {
        AuthenticatedUser user = new AuthenticatedUser(UUID.randomUUID(), "entrenador@test", Role.ENTRENADOR);
        Message<?> ownQueue = withUser(frame(StompCommand.SUBSCRIBE, "/user/queue/mensajes", null), user);
        assertDoesNotThrow(() -> interceptor().preSend(ownQueue, channel));
        Message<?> foreignTopic = withUser(frame(StompCommand.SUBSCRIBE, "/topic/mensajes/otra-persona", null), user);
        assertThrows(IllegalArgumentException.class, () -> interceptor().preSend(foreignTopic, channel));
    }

    private StompJwtChannelInterceptor interceptor() { return new StompJwtChannelInterceptor(jwtService); }
    private Message<?> frame(StompCommand command, String destination, String authorization) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setLeaveMutable(true);
        if (destination != null) accessor.setDestination(destination);
        if (authorization != null) accessor.addNativeHeader("Authorization", authorization);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
    private Message<?> withUser(Message<?> source, AuthenticatedUser user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(source);
        accessor.setUser(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(user, null));
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
