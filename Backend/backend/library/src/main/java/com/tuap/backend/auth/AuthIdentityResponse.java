package com.tuap.backend.auth; import java.time.Instant; import com.tuap.backend.dominio.entidades.AuthIdentity;
/** Safe identity projection: deliberately excludes providerSubject, ownership and linked email metadata. */
public record AuthIdentityResponse(AuthProvider provider,Instant createdAt,Instant lastUsedAt,boolean active){static AuthIdentityResponse from(AuthIdentity i){return new AuthIdentityResponse(i.getProvider(),i.getCreatedAt(),i.getLastUsedAt(),i.isActive());}}
