package com.tuap.backend.dominio.gestores;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.persistencia.ClienteDAO;

@Controller
public class GestorCliente {

    private static final String ATTR_ERROR = "error";
    private static final String MSG_NOT_FOUND = "Cliente no encontrado";
    private static final String ATTR_CLIENTE = "cliente";
    private static final String VIEW_ERROR = "error";

    private final ClienteDAO clienteDAO;

    public GestorCliente(ClienteDAO clienteDAO) {
        this.clienteDAO = clienteDAO;
    }

    // 📦 DTO interno para reducir el número de parámetros (Clean Code)
    public record PerfilParams(
        String nombre, String apellido, String email, 
        double peso, int altura, int edad, 
        String objetivo, MultipartFile foto
    ) {}

    public Cliente verPerfil(UUID idCliente) {
        return clienteDAO.findById(idCliente).orElse(null);
    }

    @GetMapping("/menucliente/{id}")
    public String menuCliente(@PathVariable UUID id, Model model) {
        
        Optional<Cliente> clienteOpt = clienteDAO.findById(id);
        if (clienteOpt.isEmpty()) {
            model.addAttribute(ATTR_ERROR, MSG_NOT_FOUND);
            return VIEW_ERROR;
        }

        model.addAttribute(ATTR_CLIENTE, clienteOpt.get());
        return "menucliente";
    }

    @GetMapping("/cliente/perfil/{id}")
    public String verPerfilCliente(@PathVariable UUID id, Model model) {
        Cliente cliente = verPerfil(id);
        if (cliente != null) {
            model.addAttribute(ATTR_CLIENTE, cliente);
            return "perfilCliente";
        } else {
            model.addAttribute(ATTR_ERROR, MSG_NOT_FOUND);
            return VIEW_ERROR;
        }
    }

    @GetMapping("/cliente/editar/{id}")
    public String editarPerfilCliente(@PathVariable UUID id, Model model) {
        Cliente cliente = verPerfil(id);
        if (cliente != null) {
            model.addAttribute(ATTR_CLIENTE, cliente);
            return "editarPerfilCliente";
        } else {
            model.addAttribute(ATTR_ERROR, MSG_NOT_FOUND);
            return VIEW_ERROR;
        }
    }

    @PostMapping("/cliente/perfil/{id}/editar")
    public String guardarCambiosPerfil(
            @PathVariable UUID id,
            @RequestParam("nombre") String nombre,
            @RequestParam("apellido") String apellido,
            @RequestParam("email") String email,
            @RequestParam("peso") double peso,
            @RequestParam("altura") int altura,
            @RequestParam("edad") int edad,
            @RequestParam("objetivo") String objetivo,
            @RequestParam("foto") MultipartFile foto) throws IOException {

        // Agrupamos parámetros en un objeto para cumplir con el límite de SonarQube
        PerfilParams params = new PerfilParams(nombre, apellido, email, peso, altura, edad, objetivo, foto);
        actualizarPerfil(id, params);
        
        return "redirect:/cliente/perfil/" + id;
    }

    public void actualizarPerfil(UUID idCliente, PerfilParams params) throws IOException {
        Optional<Cliente> clienteOpt = clienteDAO.findById(idCliente);
        if (clienteOpt.isPresent()) {
            Cliente cliente = clienteOpt.get();

            cliente.setNombre(params.nombre());
            cliente.setApellido(params.apellido());
            cliente.setEmail(params.email());
            cliente.setPeso(params.peso());
            cliente.setAltura(params.altura());
            cliente.setEdad(params.edad());
            cliente.setObjetivo(params.objetivo());

            // Manejo de la foto
            procesarFotoPerfil(cliente, params.foto());

            clienteDAO.save(cliente);
        }
    }

    private void procesarFotoPerfil(Cliente cliente, MultipartFile foto) throws IOException {
        if (foto != null && !foto.isEmpty() && foto.getOriginalFilename() != null) {
            String originalName = foto.getOriginalFilename();
            String nombreOriginalLimpio = org.springframework.util.StringUtils.cleanPath(originalName);
            
            String nombreArchivoSeguro = java.nio.file.Paths.get(nombreOriginalLimpio).getFileName().toString();
            String nombreFinal = UUID.randomUUID() + "_" + nombreArchivoSeguro;
            
            Path rutaBase = Paths.get("uploads").toAbsolutePath().normalize();
            Path rutaDestino = rutaBase.resolve(nombreFinal).normalize();
            
            if (!rutaDestino.startsWith(rutaBase)) {
                throw new SecurityException("Intento de Path Traversal detectado.");
            }
            
            Files.createDirectories(rutaDestino.getParent());
            Files.write(rutaDestino, foto.getBytes());
            cliente.setFotoPerfil(nombreFinal);
        }
    }
}
