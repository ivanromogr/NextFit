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
        config.enableSimpleBroker("/topic"); // Donde se envían los mensajes públicos/privados
        config.setApplicationDestinationPrefixes("/app"); // Prefijo para enviar mensajes desde el cliente
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Punto de conexión del socket (importante para React)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Permite conexión desde localhost:3000
                .withSockJS(); // Habilita SockJS por si el navegador no soporta WS nativo
    }
}