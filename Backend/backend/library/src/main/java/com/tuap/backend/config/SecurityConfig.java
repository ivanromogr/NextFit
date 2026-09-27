package com.tuap.backend.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;


import com.tuap.backend.auth.JwtAccessDeniedHandler;
import com.tuap.backend.auth.JwtAuthenticationEntryPoint;
import com.tuap.backend.auth.JwtAuthenticationFilter;
import com.tuap.backend.auth.JwtService;
import com.tuap.backend.auth.JwtProperties;
import com.tuap.backend.auth.RefreshTokenProperties;
import com.tuap.backend.auth.IdentityResolver;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    private final CustomUserDetailsService userDetailsService;
    public SecurityConfig(CustomUserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtAuthenticationFilter jwtAuthenticationFilter,
                                                   JwtAuthenticationEntryPoint authenticationEntryPoint,
                                                   JwtAccessDeniedHandler accessDeniedHandler) throws Exception {
        http
            // Bearer APIs are stateless; refresh/logout web are protected by an explicit Origin allowlist.
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/ejercicios/importar", "/api/ejercicios/importar-json", "/api/ejercicios/retraducir",
                                 "/api/recover-password").denyAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/auth/login", "/api/auth/refresh", "/api/auth/logout", "/api/auth/password/forgot", "/api/auth/password/reset", "/api/register").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/", "/api", "/actuator/health").permitAll()
                // SockJS needs an HTTP handshake; STOMP CONNECT is authenticated by StompJwtChannelInterceptor.
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/ejercicios/**", "/api/entrenador/publicos",
                                 "/api/entrenador/*", "/api/entrenador/*/reviews").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/upload/files/**").permitAll()
                .requestMatchers("/api/entrenador/*/clientes", "/api/entrenador/*/dashboard-resumen",
                                 "/api/entrenador/*/fichar", "/api/entrenador/*/desvincular/**").hasRole("ENTRENADOR")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/entrenador/**").hasRole("ENTRENADOR")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/entrenador/onboarding").hasRole("ENTRENADOR")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/clientes/**").hasRole("CLIENTE")
                .requestMatchers("/api/clientes/onboarding", "/api/clientes/*/desvincular-entrenador", "/api/cliente/onboarding")
                    .hasRole("CLIENTE")
                .requestMatchers("/api/rutinas/**", "/api/calendario/**", "/api/sesiones/**", "/api/stats/**", "/api/chat/**")
                    .hasAnyRole("CLIENTE", "ENTRENADOR")
                .requestMatchers("/api/upload/**").authenticated()
                .anyRequest().authenticated()
            )
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(Customizer.withDefaults())
                .referrerPolicy(policy -> policy.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(
            Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toList()
        );

        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Client-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @org.springframework.boot.context.properties.ConfigurationProperties(prefix = "jwt")
    public JwtProperties jwtProperties() {
        return new JwtProperties();
    }

    @Bean
    @org.springframework.boot.context.properties.ConfigurationProperties(prefix = "refresh-token")
    public RefreshTokenProperties refreshTokenProperties() { return new RefreshTokenProperties(); }

    @Bean
    public JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint() {
        return new JwtAuthenticationEntryPoint();
    }

    @Bean
    public JwtAccessDeniedHandler jwtAccessDeniedHandler() {
        return new JwtAccessDeniedHandler();
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwtService,
            JwtAuthenticationEntryPoint authenticationEntryPoint, IdentityResolver identities) {
        return new JwtAuthenticationFilter(jwtService, authenticationEntryPoint, identities);
    }

    @Bean
    public org.springframework.boot.web.servlet.FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(
            JwtAuthenticationFilter jwtAuthenticationFilter) {
        var registration = new org.springframework.boot.web.servlet.FilterRegistrationBean<>(jwtAuthenticationFilter);
        registration.setEnabled(false);
        return registration;
    }
}
