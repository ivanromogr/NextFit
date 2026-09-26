package com.tuap.backend.dominio.entidades;

import java.time.Instant;
import java.util.UUID;
import com.tuap.backend.auth.ClientType;
import com.tuap.backend.auth.Role;
import jakarta.persistence.*;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id @GeneratedValue(strategy = GenerationType.AUTO) private UUID id;
    @Column(nullable = false) private UUID userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Role role;
    @Column(nullable = false, unique = true, length = 64) private String tokenHash;
    @Column(nullable = false) private UUID familyId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ClientType clientType;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private Instant expiresAt;
    private Instant revokedAt;
    private Instant rotatedAt;
    @Column(length = 64) private String replacedByHash;
    protected RefreshToken() { }
    public RefreshToken(UUID userId, Role role, String tokenHash, UUID familyId, ClientType clientType, Instant createdAt, Instant expiresAt) {
        this.userId=userId; this.role=role; this.tokenHash=tokenHash; this.familyId=familyId; this.clientType=clientType; this.createdAt=createdAt; this.expiresAt=expiresAt;
    }
    public UUID getId() { return id; } public UUID getUserId() { return userId; } public Role getRole() { return role; }
    public String getTokenHash() { return tokenHash; } public UUID getFamilyId() { return familyId; } public ClientType getClientType() { return clientType; }
    public Instant getCreatedAt() { return createdAt; } public Instant getExpiresAt() { return expiresAt; } public Instant getRevokedAt() { return revokedAt; }
    public Instant getRotatedAt() { return rotatedAt; } public String getReplacedByHash() { return replacedByHash; }
    public boolean isActiveAt(Instant now) { return revokedAt == null && expiresAt.isAfter(now); }
    public void rotateTo(String nextHash, Instant when) { revokedAt=when; rotatedAt=when; replacedByHash=nextHash; }
    public void revoke(Instant when) { if (revokedAt == null) revokedAt=when; }
}
