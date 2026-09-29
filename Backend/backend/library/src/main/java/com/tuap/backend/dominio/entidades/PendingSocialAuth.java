package com.tuap.backend.dominio.entidades;
import java.time.Instant; import java.util.UUID; import com.tuap.backend.auth.AuthProvider; import jakarta.persistence.*;
@Entity public class PendingSocialAuth {
 @Id @GeneratedValue(strategy=GenerationType.AUTO) private UUID id;
 @Column(nullable=false,unique=true,length=64) private String tokenHash;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private AuthProvider provider;
 @Column(nullable=false) private String providerSubject; @Column(nullable=true) private String verifiedEmail; private String displayName;
 @Column(nullable=false) private Instant expiresAt; private Instant consumedAt; @Column(nullable=false) private Instant createdAt;
 protected PendingSocialAuth(){} public PendingSocialAuth(String h,AuthProvider p,String s,String e,String n,Instant x,Instant c){tokenHash=h;provider=p;providerSubject=s;verifiedEmail=e;displayName=n;expiresAt=x;createdAt=c;}
 public String getTokenHash(){return tokenHash;} public AuthProvider getProvider(){return provider;} public String getProviderSubject(){return providerSubject;} public String getVerifiedEmail(){return verifiedEmail;} public Instant getExpiresAt(){return expiresAt;} public Instant getConsumedAt(){return consumedAt;} public void consume(Instant now){consumedAt=now;}
}
