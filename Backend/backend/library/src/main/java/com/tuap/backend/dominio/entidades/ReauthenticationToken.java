package com.tuap.backend.dominio.entidades;

import java.time.Instant;
import java.util.UUID;
import com.tuap.backend.auth.AuthProvider;
import com.tuap.backend.auth.Role;
import jakarta.persistence.*;

@Entity @Table(name="reauthentication_tokens") public class ReauthenticationToken {
 @Id @GeneratedValue(strategy=GenerationType.AUTO) private UUID id; @Column(nullable=false,unique=true,length=64) private String tokenHash; @Column(nullable=false) private UUID userId; @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Role role; @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private AuthProvider targetProvider; @Column(nullable=false,updatable=false) private Instant createdAt; @Column(nullable=false) private Instant expiresAt; private Instant consumedAt;
 protected ReauthenticationToken(){} public ReauthenticationToken(String hash,UUID userId,Role role,AuthProvider target,Instant created,Instant expires){tokenHash=hash;this.userId=userId;this.role=role;targetProvider=target;createdAt=created;expiresAt=expires;}
 public String getTokenHash(){return tokenHash;} public UUID getUserId(){return userId;} public Role getRole(){return role;} public AuthProvider getTargetProvider(){return targetProvider;} public Instant getCreatedAt(){return createdAt;} public Instant getExpiresAt(){return expiresAt;} public Instant getConsumedAt(){return consumedAt;} public boolean isUsableAt(Instant now){return consumedAt==null&&expiresAt.isAfter(now);} public void consume(Instant now){if(consumedAt==null)consumedAt=now;}
}
