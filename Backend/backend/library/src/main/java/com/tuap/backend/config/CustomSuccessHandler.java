package com.tuap.backend.config;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
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

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        String email = authentication.getName();
        String role = "cliente";
        Object id = null;

        // Buscamos el ID
        Optional<Cliente> clienteOpt = clienteDAO.findByEmail(email);
        if (clienteOpt.isPresent()) {
            Cliente cliente = clienteOpt.get();
            id = cliente.getId();
            role = "cliente";
        } else {
            Optional<Entrenador> entrenadorOpt = entrenadorDAO.findByEmail(email);
            if (entrenadorOpt.isPresent()) {
                Entrenador entrenador = entrenadorOpt.get();
                id = entrenador.getId();
                role = "entrenador";
            }
        }

        // AQUÍ ESTÁ EL CAMBIO: Devolvemos JSON en vez de redirigir
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/json;charset=UTF-8");

        Map<String, Object> data = new HashMap<>();
        data.put("status", 200);
        data.put("message", "Login exitoso");
        data.put("role", role);
        data.put("id", id);
        data.put("email", email);

        response.getWriter().write(objectMapper.writeValueAsString(data));
        response.flushBuffer();
    }
}