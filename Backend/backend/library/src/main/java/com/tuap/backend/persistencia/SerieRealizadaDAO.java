    package com.tuap.backend.persistencia;

    import java.util.List;
    import java.util.UUID;

    import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tuap.backend.dominio.entidades.SerieRealizada;

    public interface SerieRealizadaDAO extends JpaRepository<SerieRealizada, UUID> {
        List<SerieRealizada> findBySesionClienteIdAndEjercicioId(UUID clienteId, UUID ejercicioId);
        // Busca series completadas de un cliente para un ejercicio concreto, cronológicamente.
    @Query("SELECT s FROM SerieRealizada s " +
           "JOIN s.sesion ses " +
           "WHERE ses.cliente.id = :clienteId " +
           "AND s.ejercicio.id = :ejercicioId " +
           "AND s.hecho = true " +
           "ORDER BY ses.fechaHora ASC")
    List<SerieRealizada> findHistorialEjercicio(@Param("clienteId") UUID clienteId, 
                                                @Param("ejercicioId") UUID ejercicioId);
}
    
