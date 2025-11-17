package com.tuap.backend.dominio.gestores;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
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
    @Autowired
    private ClienteDAO clienteDAO;

    public Cliente verPerfil(UUID idCliente) {
        Optional<Cliente> clienteOpt = clienteDAO.findById(idCliente);
        return clienteOpt.orElse(null);
    }

    @GetMapping("/menucliente/{id}")
    public String menuCliente(@PathVariable UUID id, Model model) {
        // Obtener el contexto de seguridad actual
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        

        // Verificar si el cliente existe en base de datos
        Optional<Cliente> clienteOpt = clienteDAO.findById(id);
        if (clienteOpt.isEmpty()) {
            model.addAttribute("error", "Cliente no encontrado");
            return "error";
        }

        Cliente cliente = clienteOpt.get();
        model.addAttribute("cliente", cliente);

        return "menucliente"; // Nombre de la vista HTML
    }
    // Ver tu perfil 
    @GetMapping("/cliente/perfil/{id}")
    public String verPerfilCliente(@PathVariable UUID id, Model model) {
        Cliente cliente = verPerfil(id);
        if (cliente != null) {
            model.addAttribute("cliente", cliente);
            return "perfilCliente";
        } else {
            model.addAttribute("error", "Cliente no encontrado");
            return "error";
        }
    }
    //editar tu perfil
    @GetMapping("/cliente/editar/{id}")
    public String editarPerfilCliente(@PathVariable UUID id, Model model) {
        Cliente cliente = verPerfil(id);
        if (cliente != null) {
            model.addAttribute("cliente", cliente);
            return "editarPerfilCliente";
        } else {
            model.addAttribute("error", "Cliente no encontrado");
            return "error";
        }
    }

    // PostMapping

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

        actualizarPerfil(id, nombre, apellido, email, peso, altura, edad, objetivo, foto);
        return "redirect:/cliente/perfil/" + id;
    }

    public void actualizarPerfil(UUID idCliente, String nombre, String apellido, String email,
            double peso, int altura, int edad, String objetivo,
            MultipartFile foto) throws IOException {
        Optional<Cliente> clienteOpt = clienteDAO.findById(idCliente);
        if (clienteOpt.isPresent()) {
            Cliente cliente = clienteOpt.get();

            cliente.setNombre(nombre);
            cliente.setApellido(apellido);
            cliente.setEmail(email);
            cliente.setPeso(peso);
            cliente.setAltura(altura);
            cliente.setEdad(edad);
            cliente.setObjetivo(objetivo);

            // Manejo de la foto
            if (!foto.isEmpty()) {
                String nombreArchivo = UUID.randomUUID() + "_" + foto.getOriginalFilename();
                Path ruta = Paths.get("uploads", nombreArchivo);
                Files.createDirectories(ruta.getParent());
                Files.write(ruta, foto.getBytes());
                cliente.setFotoPerfil(nombreArchivo);
            }

            clienteDAO.save(cliente);
        }
    }

}
