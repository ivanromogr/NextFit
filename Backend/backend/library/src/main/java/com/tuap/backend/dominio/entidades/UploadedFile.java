package com.tuap.backend.dominio.entidades;

import java.time.Instant;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.tuap.backend.auth.Role;
import jakarta.persistence.*;

@Entity
@Table(name = "uploaded_files")
public class UploadedFile {
    @Id @GeneratedValue(strategy = GenerationType.AUTO) private UUID id;
    @Column(nullable = false) private UUID ownerId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Role ownerRole;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private UploadPurpose purpose;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private UploadVisibility visibility;
    @JsonIgnore @Column(nullable = false, unique = true, length = 100) private String storageKey;
    @Column(nullable = false, length = 255) private String originalFilename;
    @Column(nullable = false, length = 100) private String mimeType;
    @Column(nullable = false) private long size;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    protected UploadedFile() { }
    public UploadedFile(UUID ownerId, Role ownerRole, UploadPurpose purpose, UploadVisibility visibility, String storageKey, String originalFilename, String mimeType, long size) {
        this.ownerId=ownerId; this.ownerRole=ownerRole; this.purpose=purpose; this.visibility=visibility; this.storageKey=storageKey; this.originalFilename=originalFilename; this.mimeType=mimeType; this.size=size; this.createdAt=Instant.now();
    }
    public UUID getId(){return id;} public UUID getOwnerId(){return ownerId;} public Role getOwnerRole(){return ownerRole;} public UploadPurpose getPurpose(){return purpose;} public UploadVisibility getVisibility(){return visibility;} public String getStorageKey(){return storageKey;} public String getOriginalFilename(){return originalFilename;} public String getMimeType(){return mimeType;} public long getSize(){return size;} public Instant getCreatedAt(){return createdAt;}
}
