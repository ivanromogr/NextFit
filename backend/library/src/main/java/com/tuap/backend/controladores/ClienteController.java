package com.tuap.backend.controladores;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.persistencia.ClienteDAO;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteDAO clienteDAO;

    public ClienteController(ClienteDAO clienteDAO) {
        this.clienteDAO = clienteDAO;
    }

    @GetMapping
    public List<Cliente> listar() {
        return clienteDAO.findAll();
    }

    @GetMapping("/{id}")
    public Cliente obtener(@PathVariable UUID id) {
        return clienteDAO.findById(id).orElse(null);
    }
}
