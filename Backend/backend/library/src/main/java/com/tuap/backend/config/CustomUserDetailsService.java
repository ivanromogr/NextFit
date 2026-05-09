package com.tuap.backend.config;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final ClienteDAO clienteDAO;
    private final EntrenadorDAO entrenadorDAO;

    public CustomUserDetailsService(ClienteDAO clienteDAO, EntrenadorDAO entrenadorDAO) {
        this.clienteDAO = clienteDAO;
        this.entrenadorDAO = entrenadorDAO;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return clienteDAO.findByEmail(email)
            .map(cliente -> User.builder()
                .username(cliente.getEmail())
                
                .password(cliente.getContrasena()) 
                .roles(cliente.getRol().replace("ROLE_", ""))
                .build())
            .or(() -> entrenadorDAO.findByEmail(email)
                .map(entrenador -> User.builder()
                    .username(entrenador.getEmail())
                    //  Llamamos a getContrasena() sin la "ñ"
                    .password(entrenador.getContrasena()) 
                    .roles(entrenador.getRol().replace("ROLE_", ""))
                    .build()))
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
    }
}