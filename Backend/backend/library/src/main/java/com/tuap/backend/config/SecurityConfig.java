package com.tuap.backend.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final CustomSuccessHandler customSuccessHandler;

    public SecurityConfig(CustomUserDetailsService userDetailsService,
                          CustomSuccessHandler customSuccessHandler) {
        this.userDetailsService = userDetailsService;
        this.customSuccessHandler = customSuccessHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. Desactivar CSRF (común en APIs REST que no usan vistas HTML servidor)
            .csrf(AbstractHttpConfigurer::disable)
            
            // 2. Configurar CORS usando el Bean definido abajo
            .cors(Customizer.withDefaults()) 

            // 3. Reglas de Autorización
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/login", "/register").permitAll() // Endpoints públicos
                .anyRequest().permitAll() // 🔓 AHORA MISMO TODO ABIERTO (Para desarrollo)
            )

            // 4. Login Form
            .formLogin(form -> form
                .loginPage("/login")
                .successHandler(customSuccessHandler)
                .permitAll()
            )

            // 5. Logout
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login")
                .permitAll()
            );

        return http.build();
    }

    // ✅ CONFIGURACIÓN CORS PROFESIONAL (CENTRALIZADA)
    // Esto reemplaza cualquier otro archivo de configuración de CORS
    @Bean
    UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // ⚠️ SEGURIDAD: Especificamos EXACTAMENTE quién puede entrar. Nada de "*"
        configuration.setAllowedOrigins(List.of("http://localhost:5173")); 
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        configuration.setAllowCredentials(true); // Permite cookies y sesión
        configuration.setMaxAge(3600L); // Cache de preflight request (1 hora)

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authManager(HttpSecurity http) throws Exception {
        return http.getSharedObject(AuthenticationManagerBuilder.class)
            .userDetailsService(userDetailsService)
            .passwordEncoder(passwordEncoder())
            .and()
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}