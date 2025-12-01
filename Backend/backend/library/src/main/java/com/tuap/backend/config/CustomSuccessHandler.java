package com.tuap.backend.config;

import java.io.IOException;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class CustomSuccessHandler implements AuthenticationSuccessHandler {
    @Autowired
    private ClienteDAO clienteDAO;

    @Autowired
    private EntrenadorDAO entrenadorDAO;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        String email = authentication.getName();
        Optional<Cliente> clienteOpt = clienteDAO.findByEmail(email);
        if (clienteOpt.isPresent()) {
            Cliente cliente = clienteOpt.get();
            response.sendRedirect("/menucliente/" + cliente.getId());
            return;
        }

        Optional<Entrenador> entrenadorOpt = entrenadorDAO.findByEmail(email);
        if (entrenadorOpt.isPresent()) {
            Entrenador entrenador = entrenadorOpt.get();
            response.sendRedirect("/menuentrenador/" + entrenador.getId());
            return;
        }

        // Por si acaso no se encuentra el usuario
        response.sendRedirect("/login?error=true");
    }

}
