package com.tuap.backend.persistencia;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Mensaje;
@Repository
public interface MensajeDAO extends JpaRepository<Mensaje, UUID> {
}
