package com.tuap.backend.auth;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {
    private static final String ERROR_ATTRIBUTE = "nextfit.jwt.error";
    public static void setJwtError(HttpServletRequest request, String code) { request.setAttribute(ERROR_ATTRIBUTE, code); }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authenticationException) throws IOException {
        String code = (String) request.getAttribute(ERROR_ATTRIBUTE);
        if (code == null) code = "MISSING_TOKEN";
        String message = switch (code) {
            case "TOKEN_EXPIRED" -> "El access token ha expirado";
            case "INVALID_TOKEN" -> "El access token no es válido";
            default -> "Se requiere autenticación";
        };
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"status\":401,\"code\":\"" + code + "\",\"message\":\"" + message + "\"}");
    }
}
