    package com.tuap.backend.dominio.entidades;

    import java.util.Date;
    import java.util.UUID;

    import jakarta.persistence.Column;
    import jakarta.persistence.Entity;
    import jakarta.persistence.GeneratedValue;
    import jakarta.persistence.GenerationType;
    import jakarta.persistence.Id;
    import jakarta.persistence.JoinColumn;
    import jakarta.persistence.ManyToOne;
    import jakarta.persistence.Table;
    import jakarta.persistence.Temporal;
    import jakarta.persistence.TemporalType;


    @Entity
    @Table(name = "progreso")
    public class Progreso {
        @Id
        @GeneratedValue(strategy = GenerationType.AUTO)
        private UUID id;

        @ManyToOne
        @JoinColumn(name = "entrenamiento_id", nullable = false)
        private Entrenamiento entrenamiento;

        @ManyToOne
        @JoinColumn(name = "cliente_id", nullable = false)
        private Cliente cliente;

        @Column(nullable = false)
        private UUID entrenamientoid;

        @Column(nullable = false)
        private UUID clienteid;

        @Column(nullable = false)
        private String notas;

        @Column(nullable = false)
        private float pesoactual;

        @Column(nullable = false)
        private float pesomaximo;
        
        @Column(nullable = false)
        @Temporal(TemporalType.DATE)
        private Date fecha;
        
        public Progreso() {
        }

        public Progreso(UUID id, UUID entrenamientoid, UUID clienteid, String notas, float pesoactual, float pesomaximo, Date fecha) {
            this.id = id;
            this.entrenamientoid = entrenamientoid;
            this.clienteid = clienteid;
            this.notas = notas;
            this.pesoactual = pesoactual;
            this.pesomaximo = pesomaximo;
            this.fecha = fecha;
        }



        //Getters
        public UUID getId() {
            return id;
        }

        public UUID getEntrenamientoid() {
            return entrenamientoid;
        }

        public UUID getClienteid() {
            return clienteid;
        }

        public String getNotas() {
            return notas;
        }

        public float getPesoactual() {
            return pesoactual;
        }

        public float getPesomaximo() {
            return pesomaximo;
        }

        public Date getFecha() {
            return fecha;
        }



        //Setters
        public void setId(UUID id) {
            this.id = id;
        }

        public void setEntrenamientoid(UUID entrenamientoid) {
            this.entrenamientoid = entrenamientoid;
        }

        public void setClienteid(UUID clienteid) {
            this.clienteid = clienteid;
        }

        public void setNotas(String notas) {
            this.notas = notas;
        }

        public void setPesoactual(float pesoactual) {
            this.pesoactual = pesoactual;
        }

        public void setPesomaximo(float pesomaximo) {
            this.pesomaximo = pesomaximo;
        }

        public void setFecha(Date fecha) {
            this.fecha = fecha;
        }

        
        
    }
