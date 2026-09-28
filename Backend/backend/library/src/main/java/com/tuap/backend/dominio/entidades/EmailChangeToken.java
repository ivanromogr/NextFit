package com.tuap.backend.dominio.entidades;
import java.time.Instant; import java.util.UUID; import com.tuap.backend.auth.Role; import jakarta.persistence.*;
/** One-time credential for an email change. The raw value is never stored. */
@Entity @Table(name="email_change_tokens") public class EmailChangeToken {
 @Id @GeneratedValue(strategy=GenerationType.AUTO) private UUID id; @Column(nullable=false) private UUID userId; @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Role role; @Column(nullable=false) private String newEmail; @Column(nullable=false,unique=true,length=64) private String tokenHash; @Column(nullable=false) private Instant expiresAt; private Instant consumedAt; @Column(nullable=false,updatable=false) private Instant createdAt;
 protected EmailChangeToken(){} public EmailChangeToken(UUID u,Role r,String e,String h,Instant x,Instant c){userId=u;role=r;newEmail=e;tokenHash=h;expiresAt=x;createdAt=c;} public UUID getUserId(){return userId;} public Role getRole(){return role;} public String getNewEmail(){return newEmail;} public String getTokenHash(){return tokenHash;} public Instant getExpiresAt(){return expiresAt;} public Instant getConsumedAt(){return consumedAt;} public boolean isUsableAt(Instant n){return consumedAt==null&&expiresAt.isAfter(n);} public void consume(Instant n){consumedAt=n;}
}
