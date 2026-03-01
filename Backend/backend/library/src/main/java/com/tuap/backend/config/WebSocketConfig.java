package com.tuap.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Prefijo para los mensajes que el servidor envía al cliente (suscripciones)
        config.enableSimpleBroker("/topic"); 
        
        // Prefijo para los mensajes que el cliente envía al servidor (@MessageMapping)
        config.setApplicationDestinationPrefixes("/app"); 
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // ✅ SOLUCIÓN: Eliminamos .withSockJS() para permitir WebSockets nativos
        // Esto es lo que React Native y @stomp/stompjs necesitan
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*"); 
    }
}