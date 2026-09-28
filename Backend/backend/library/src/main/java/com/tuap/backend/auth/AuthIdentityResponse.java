package com.tuap.backend.auth; import java.time.Instant; import com.tuap.backend.dominio.entidades.AuthIdentity;
/** Safe identity projection: deliberately excludes providerSubject and internal ownership. */
public record AuthIdentityResponse(AuthProvider provider,String emailAtLinkTime,Instant createdAt,Instant lastUsedAt,boolean active){static AuthIdentityResponse from(AuthIdentity i){return new AuthIdentityResponse(i.getProvider(),i.getEmailAtLinkTime(),i.getCreatedAt(),i.getLastUsedAt(),i.isActive());}}
