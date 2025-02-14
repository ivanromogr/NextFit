package com.tuap.backend.dominio.gestores;

import java.util.Date;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Usuario;
import com.tuap.backend.repositorios.UsuarioRepository;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

@Service
@RestController
@RequestMapping("/api")
public class GestorLogin {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String SECRET_KEY = "mySecretKey"; // Clave secreta para firmar los tokens JWT

    @GetMapping("/usuarios")
    public List<Usuario> getAllUsuarios() {
        return usuarioRepository.findAll();
    }

    @GetMapping("/usuarios/{id}")
    public Usuario getUsuarioById(@PathVariable Long id) {
        return usuarioRepository.findById(id).orElse(null);
    }
    
    @PostMapping("/login")
    public String login(@RequestParam String email, @RequestParam String password) {
        Usuario usuario = usuarioRepository.findByEmail(email);
        if (usuario != null && passwordEncoder.matches(password, usuario.getContraseña())) {
            return generateToken(usuario);
        }
        return null;
    }

    @PostMapping("/register")
    public Usuario register(@RequestParam String nombre, @RequestParam String apellido, @RequestParam String email, @RequestParam String contraseña, @RequestParam String rol) {
        Usuario usuario = new Usuario(email, passwordEncoder.encode(contraseña), nombre, apellido, rol);
        return usuarioRepository.save(usuario);
    }

    @PostMapping("/recover-password")
    public boolean recoverPassword(@RequestParam String email, @RequestParam String nuevaContraseña) {
        Usuario usuario = usuarioRepository.findByEmail(email);
        if (usuario != null) {
            usuario.setContraseña(passwordEncoder.encode(nuevaContraseña));
            usuarioRepository.save(usuario);
            return true;
        }
        return false;
    }

    private String generateToken(Usuario usuario) {
        return Jwts.builder()
                .setSubject(usuario.getEmail())
                .claim("roles", usuario.getRol())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // 1 día
                .signWith(SignatureAlgorithm.HS512, SECRET_KEY)
                .compact();
    }
}
